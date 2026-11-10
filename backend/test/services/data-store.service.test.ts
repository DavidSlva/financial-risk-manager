import { readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { userRow } from '../helpers/user-fixtures.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DataIntegrityError, createDataStore } from '../../src/services/data-store.service.js';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';

describe('data-store.service', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('carga los cuatro archivos', () => {
    writeAll(dir, validData(), 1000);

    const snapshot = createDataStore(dir).load();

    expect(snapshot.roles).toHaveLength(2);
    expect(snapshot.users).toHaveLength(2);
    expect(snapshot.scores).toHaveLength(1);
    expect(snapshot.permissions).toHaveLength(3);
  });

  it('devuelve los datos congelados (la caché no se puede mutar)', () => {
    writeAll(dir, validData(), 1000);

    const snapshot = createDataStore(dir).load();

    expect(Object.isFrozen(snapshot.users)).toBe(true);
    expect(Object.isFrozen(snapshot.users[0])).toBe(true);
    expect(Object.isFrozen(snapshot.permissions)).toBe(true);
    expect(Object.isFrozen(snapshot.permissions[0])).toBe(true);
  });

  it('falla con todas las violaciones si los datos no son íntegros', () => {
    const data = validData();
    data.scores = [{ rut: '99999999-9', score: 5000 }];
    writeAll(dir, data, 1000);

    const store = createDataStore(dir);

    expect(() => store.load()).toThrow(DataIntegrityError);
    try {
      store.load();
    } catch (error) {
      expect((error as DataIntegrityError).violations.map((v) => v.rule).sort()).toEqual([
        'IR-8',
        'IR-9',
      ]);
    }
  });

  it('falla si falta permissions.json', () => {
    const data = validData();
    writeDataFile(dir, 'roles', data.roles, 1000);
    writeDataFile(dir, 'users', data.users, 1000);
    writeDataFile(dir, 'scores', data.scores, 1000);

    expect(() => createDataStore(dir).load()).toThrow(/permissions.json/);
  });

  it('falla si permissions.json viola la integridad (IR-12)', () => {
    const data = validData();
    data.permissions = [{ role: 'admin', key: 'inventado', value: true }];
    writeAll(dir, data, 1000);

    expect(() => createDataStore(dir).load()).toThrow(/IR-12/);
  });

  it('falla si falta un archivo', () => {
    writeDataFile(dir, 'roles', validData().roles, 1000);

    expect(() => createDataStore(dir).load()).toThrow(/users\.json/);
  });

  it('falla si el JSON es inválido', () => {
    const data = validData();
    writeAll(dir, data, 1000);
    writeDataFile(dir, 'users', '[{ "rut": ', 1000);

    expect(() => createDataStore(dir).load()).toThrow(/JSON/);
  });

  it('reutiliza la caché mientras los archivos no cambian', () => {
    writeAll(dir, validData(), 1000);
    const store = createDataStore(dir);

    expect(store.load()).toBe(store.load());
  });

  it('recarga cuando cambia la fecha de modificación (revocación sin reiniciar)', () => {
    writeAll(dir, validData(), 1000);
    const store = createDataStore(dir);
    expect(store.load().users[1]?.active).toBe(false);

    const data = validData();
    data.users = [userRow('11111111-1', 'admin', false), userRow('22222222-2', 'user', true)];
    writeDataFile(dir, 'users', data.users, 2000);

    const reloaded = store.load();

    expect(reloaded.users[0]?.active).toBe(false);
    expect(reloaded.users[1]?.active).toBe(true);
  });

  it('falla cerrado: tras una edición inválida no devuelve los datos anteriores', () => {
    writeAll(dir, validData(), 1000);
    const store = createDataStore(dir);
    store.load();

    writeDataFile(dir, 'users', '{ roto', 2000);

    expect(() => store.load()).toThrow();
    expect(() => store.load()).toThrow();
  });

  it('se recupera al corregir los datos', () => {
    writeAll(dir, validData(), 1000);
    const store = createDataStore(dir);
    writeDataFile(dir, 'users', '{ roto', 2000);
    expect(() => store.load()).toThrow();

    writeDataFile(dir, 'users', validData().users, 3000);

    expect(store.load().users).toHaveLength(2);
  });

  describe('updateUsers (escritura atómica, spec 009)', () => {
    type Row = { rut: string; failed_attempts: number };
    const bump =
      (rut: string, by = 1) =>
      (users: readonly Row[]) => ({
        users: users.map((u) =>
          u.rut === rut ? { ...u, failed_attempts: u.failed_attempts + by } : u,
        ),
        result: users.find((u) => u.rut === rut)?.failed_attempts ?? -1,
      });
    const diskUsers = () => JSON.parse(readFileSync(join(dir, 'users.json'), 'utf8')) as Row[];

    beforeEach(() => {
      writeAll(dir, validData(), 1000);
    });

    it('escribe el cambio en users.json y lo devuelve en la siguiente lectura', async () => {
      const store = createDataStore(dir);

      const previous = await store.updateUsers(bump('11111111-1', 3) as never);

      expect(previous).toBe(0);
      expect(store.load().users[0]?.failed_attempts).toBe(3);
      expect(diskUsers()[0]?.failed_attempts).toBe(3);
    });

    it('escribe JSON legible (arreglo con sangría y salto de línea final)', async () => {
      await createDataStore(dir).updateUsers(bump('11111111-1') as never);

      const text = readFileSync(join(dir, 'users.json'), 'utf8');

      expect(text.endsWith('\n')).toBe(true);
      expect(text).toContain('\n  {');
    });

    it('no escribe cuando el callback devuelve users: null', async () => {
      const store = createDataStore(dir);
      const before = statSync(join(dir, 'users.json')).mtimeMs;

      const result = await store.updateUsers(() => ({ users: null, result: 'sin cambios' }));

      expect(result).toBe('sin cambios');
      expect(statSync(join(dir, 'users.json')).mtimeMs).toBe(before);
    });

    it('no toca los demás archivos', async () => {
      const before = ['roles', 'scores', 'permissions'].map((n) =>
        readFileSync(join(dir, n + '.json'), 'utf8'),
      );

      await createDataStore(dir).updateUsers(bump('11111111-1') as never);

      const after = ['roles', 'scores', 'permissions'].map((n) =>
        readFileSync(join(dir, n + '.json'), 'utf8'),
      );
      expect(after).toEqual(before);
    });

    it('rechaza un resultado que viola la integridad y no escribe nada', async () => {
      const store = createDataStore(dir);
      const before = readFileSync(join(dir, 'users.json'), 'utf8');

      await expect(store.updateUsers(bump('11111111-1', -5) as never)).rejects.toThrow(
        DataIntegrityError,
      );

      expect(readFileSync(join(dir, 'users.json'), 'utf8')).toBe(before);
      expect(store.load().users[0]?.failed_attempts).toBe(0);
    });

    it('falla cerrado si los datos actuales no son íntegros', async () => {
      const store = createDataStore(dir);
      writeDataFile(dir, 'users', '{ roto', 2000);

      await expect(store.updateUsers(bump('11111111-1') as never)).rejects.toThrow(
        DataIntegrityError,
      );
      expect(readFileSync(join(dir, 'users.json'), 'utf8')).toBe('{ roto');
    });

    it('no pierde actualizaciones concurrentes (serializa las escrituras)', async () => {
      const store = createDataStore(dir);

      await Promise.all(
        Array.from({ length: 25 }, () => store.updateUsers(bump('11111111-1') as never)),
      );

      expect(store.load().users[0]?.failed_attempts).toBe(25);
      expect(diskUsers()[0]?.failed_attempts).toBe(25);
    });

    it('dos escrituras seguidas se reflejan en la lectura (la caché se reinicia)', async () => {
      const store = createDataStore(dir);

      await store.updateUsers(bump('11111111-1') as never);
      await store.updateUsers(bump('11111111-1') as never);

      expect(store.load().users[0]?.failed_attempts).toBe(2);
    });

    it('no deja archivos temporales ni tras un éxito ni tras un rechazo', async () => {
      const store = createDataStore(dir);

      await store.updateUsers(bump('11111111-1') as never);
      await store.updateUsers(bump('11111111-1', -9) as never).catch(() => undefined);

      expect(readdirSync(dir).sort()).toEqual([
        'permissions.json',
        'roles.json',
        'scores.json',
        'users.json',
      ]);
    });

    it('un error del callback se propaga y no rompe las actualizaciones siguientes', async () => {
      const store = createDataStore(dir);

      await expect(
        store.updateUsers(() => {
          throw new Error('falla del callback');
        }),
      ).rejects.toThrow('falla del callback');
      await store.updateUsers(bump('11111111-1') as never);

      expect(store.load().users[0]?.failed_attempts).toBe(1);
    });

    it('el callback recibe los datos congelados: no puede mutar la caché', async () => {
      const store = createDataStore(dir);

      await store.updateUsers((users) => {
        expect(Object.isFrozen(users)).toBe(true);
        return { users: null, result: undefined };
      });
    });
  });
});
