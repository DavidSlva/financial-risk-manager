import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataStore } from '../../src/services/data-store.service.js';
import { hasPermission, requirePermission } from '../../src/services/permissions.service.js';
import type { AuthorizationContext } from '../../src/models/authorization.types.js';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';

function context(role: string): AuthorizationContext {
  return { user: { rut: '11111111-1', role, active: true }, params: {}, query: {} };
}

describe('permissions.service', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('hasPermission', () => {
    it('es true cuando el rol tiene el permiso con value true', () => {
      const store = createDataStore(dir);

      expect(hasPermission('admin', 'can_get_all_score', store)).toBe(true);
      expect(hasPermission('user', 'can_get_score', store)).toBe(true);
    });

    it('es false cuando el rol no tiene la fila (denegado por defecto)', () => {
      expect(hasPermission('user', 'can_get_all_score', createDataStore(dir))).toBe(false);
    });

    it('es false cuando el permiso está negado explícitamente (value false)', () => {
      const data = validData();
      data.permissions = [{ role: 'user', key: 'can_get_score', value: false }];
      writeAll(dir, data, 2000);

      expect(hasPermission('user', 'can_get_score', createDataStore(dir))).toBe(false);
    });

    it('es false para un rol que no existe', () => {
      expect(hasPermission('fantasma', 'can_get_score', createDataStore(dir))).toBe(false);
    });

    it('los permisos de un rol no se mezclan con los de otro', () => {
      const store = createDataStore(dir);

      expect(hasPermission('user', 'can_get_all_score', store)).toBe(false);
      expect(hasPermission('admin', 'can_get_all_score', store)).toBe(true);
    });

    it('un cambio en permissions.json rige sin reiniciar', () => {
      const store = createDataStore(dir);
      expect(hasPermission('user', 'can_get_all_score', store)).toBe(false);

      writeDataFile(
        dir,
        'permissions',
        [
          { role: 'user', key: 'can_get_score', value: true },
          { role: 'user', key: 'can_get_all_score', value: true },
        ],
        2000,
      );

      expect(hasPermission('user', 'can_get_all_score', store)).toBe(true);
    });

    it('falla cerrado: con datos corruptos lanza en lugar de conceder', () => {
      const store = createDataStore(dir);
      store.load();
      writeDataFile(dir, 'permissions', '{ roto', 2000);

      expect(() => hasPermission('admin', 'can_get_score', store)).toThrow();
    });
  });

  describe('requirePermission (recursos triviales)', () => {
    it('devuelve un callback que concede si el rol del usuario tiene el permiso', async () => {
      const check = requirePermission('can_get_all_score', createDataStore(dir));

      expect(await check(context('admin'))).toBe(true);
    });

    it('devuelve un callback que niega si el rol no lo tiene', async () => {
      const check = requirePermission('can_get_all_score', createDataStore(dir));

      expect(await check(context('user'))).toBe(false);
    });

    it('evalúa el rol vigente del contexto, no uno guardado al crear el callback', async () => {
      const check = requirePermission('can_get_all_score', createDataStore(dir));

      expect(await check(context('user'))).toBe(false);
      expect(await check(context('admin'))).toBe(true);
    });
  });
});
