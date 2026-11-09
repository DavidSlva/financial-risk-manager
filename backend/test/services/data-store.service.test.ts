import { rmSync } from 'node:fs';
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
    data.users = [
      { rut: '11111111-1', role: 'admin', active: false },
      { rut: '22222222-2', role: 'user', active: true },
    ];
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
});
