import { readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataStore, type DataStore } from '../../src/services/data-store.service.js';
import {
  findUserByRut,
  reserveLoginAttempt,
  resetLoginAttempts,
} from '../../src/services/users.service.js';
import { makeTempDir, validData, writeAll } from '../helpers/data-fixtures.js';
import { userRow } from '../helpers/user-fixtures.js';

const ACTIVE = '11111111-1';
const INACTIVE = '22222222-2';

describe('users.service', () => {
  let dir: string;
  let store: DataStore;

  beforeEach(() => {
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
    store = createDataStore(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const attemptsOf = (rut: string) => findUserByRut(rut, store)?.failed_attempts;
  const mtime = () => statSync(join(dir, 'users.json')).mtimeMs;
  const diskText = () => readFileSync(join(dir, 'users.json'), 'utf8');

  describe('findUserByRut', () => {
    it('encuentra un usuario por rut', () => {
      expect(findUserByRut(ACTIVE, store)).toEqual(userRow(ACTIVE, 'admin', true));
    });

    it('devuelve también a los usuarios no vigentes (decide quien llama)', () => {
      expect(findUserByRut(INACTIVE, store)?.active).toBe(false);
    });

    it('devuelve undefined si no existe', () => {
      expect(findUserByRut('99999999-9', store)).toBeUndefined();
    });
  });

  describe('reserveLoginAttempt', () => {
    it('reserva un intento: incrementa el contador y devuelve true', async () => {
      await expect(reserveLoginAttempt(ACTIVE, 5, store)).resolves.toBe(true);

      expect(attemptsOf(ACTIVE)).toBe(1);
    });

    it('persiste el contador en users.json', async () => {
      await reserveLoginAttempt(ACTIVE, 5, store);

      const rows = JSON.parse(diskText()) as { rut: string; failed_attempts: number }[];
      expect(rows.find((r) => r.rut === ACTIVE)?.failed_attempts).toBe(1);
    });

    it('permite exactamente el máximo de intentos y luego deniega', async () => {
      const results = [];
      for (let i = 0; i < 5; i += 1) results.push(await reserveLoginAttempt(ACTIVE, 3, store));

      expect(results).toEqual([true, true, true, false, false]);
      expect(attemptsOf(ACTIVE)).toBe(3);
    });

    it('un usuario bloqueado no escribe más (el contador deja de crecer)', async () => {
      for (let i = 0; i < 3; i += 1) await reserveLoginAttempt(ACTIVE, 3, store);
      const before = diskText();
      const beforeMtime = mtime();

      await reserveLoginAttempt(ACTIVE, 3, store);

      expect(diskText()).toBe(before);
      expect(mtime()).toBe(beforeMtime);
    });

    it('un usuario que ya está en el máximo no puede reservar', async () => {
      writeAll(
        dir,
        {
          ...validData(),
          users: [
            userRow(ACTIVE, 'admin', true, { failed_attempts: 5 }),
            userRow(INACTIVE, 'user', false),
          ],
        },
        2000,
      );

      await expect(reserveLoginAttempt(ACTIVE, 5, store)).resolves.toBe(false);
    });

    it('un rut inexistente devuelve false y no escribe', async () => {
      const before = diskText();

      await expect(reserveLoginAttempt('99999999-9', 5, store)).resolves.toBe(false);

      expect(diskText()).toBe(before);
    });

    it('un usuario no vigente devuelve false y no escribe', async () => {
      const before = diskText();

      await expect(reserveLoginAttempt(INACTIVE, 5, store)).resolves.toBe(false);

      expect(diskText()).toBe(before);
      expect(attemptsOf(INACTIVE)).toBe(0);
    });

    it('el máximo se evalúa con el valor recibido (configuración)', async () => {
      await expect(reserveLoginAttempt(ACTIVE, 1, store)).resolves.toBe(true);
      await expect(reserveLoginAttempt(ACTIVE, 1, store)).resolves.toBe(false);
    });

    it('con peticiones concurrentes no se supera el máximo (reserva atómica)', async () => {
      const results = await Promise.all(
        Array.from({ length: 12 }, () => reserveLoginAttempt(ACTIVE, 3, store)),
      );

      expect(results.filter(Boolean)).toHaveLength(3);
      expect(attemptsOf(ACTIVE)).toBe(3);
    });

    it('solo cambia al usuario indicado', async () => {
      await reserveLoginAttempt(ACTIVE, 5, store);

      expect(attemptsOf(INACTIVE)).toBe(0);
    });
  });

  describe('resetLoginAttempts', () => {
    it('pone el contador en 0', async () => {
      await reserveLoginAttempt(ACTIVE, 5, store);
      await reserveLoginAttempt(ACTIVE, 5, store);
      expect(attemptsOf(ACTIVE)).toBe(2);

      await resetLoginAttempts(ACTIVE, store);

      expect(attemptsOf(ACTIVE)).toBe(0);
    });

    it('no escribe si el contador ya está en 0', async () => {
      const before = diskText();
      const beforeMtime = mtime();

      await resetLoginAttempts(ACTIVE, store);

      expect(diskText()).toBe(before);
      expect(mtime()).toBe(beforeMtime);
    });

    it('un rut inexistente no falla ni escribe', async () => {
      const before = diskText();

      await expect(resetLoginAttempts('99999999-9', store)).resolves.toBeUndefined();

      expect(diskText()).toBe(before);
    });

    it('después de reiniciar se puede volver a reservar hasta el máximo', async () => {
      for (let i = 0; i < 3; i += 1) await reserveLoginAttempt(ACTIVE, 3, store);
      await expect(reserveLoginAttempt(ACTIVE, 3, store)).resolves.toBe(false);

      await resetLoginAttempts(ACTIVE, store);

      await expect(reserveLoginAttempt(ACTIVE, 3, store)).resolves.toBe(true);
    });
  });
});
