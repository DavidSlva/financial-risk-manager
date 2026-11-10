import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AuthorizationContext } from '../../src/models/authorization.types.js';
import { createDataStore } from '../../src/services/data-store.service.js';
import { canGetScore, findScoreByRut } from '../../src/services/scores.service.js';
import { makeTempDir, validData, writeAll, writeDataFile } from '../helpers/data-fixtures.js';
import {
  ADMIN,
  AUDITOR,
  BLOCKED,
  GUEST,
  UNKNOWN_RUT,
  USER_WITHOUT_SCORE,
  USER_WITH_SCORE,
  scoreScenario,
} from '../helpers/score-fixtures.js';

describe('scores.service', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('findScoreByRut', () => {
    it('encuentra el score de un rut', () => {
      expect(findScoreByRut('11111111-1', createDataStore(dir))).toEqual({
        rut: '11111111-1',
        score: 780,
      });
    });

    it('devuelve undefined para un usuario sin score', () => {
      expect(findScoreByRut('22222222-2', createDataStore(dir))).toBeUndefined();
    });
  });

  describe('canGetScore (callback de autorización del recurso)', () => {
    function context(role: string, rut: string, requested: string): AuthorizationContext {
      return { user: { rut, role, active: true }, params: { rut: requested }, query: {} };
    }

    beforeEach(() => {
      writeAll(dir, scoreScenario(), 2000);
    });

    it('can_get_all_score: puede ver el score de cualquier rut', () => {
      const store = createDataStore(dir);

      expect(canGetScore(context('admin', ADMIN, USER_WITH_SCORE), store)).toBe(true);
      expect(canGetScore(context('admin', ADMIN, UNKNOWN_RUT), store)).toBe(true);
      expect(canGetScore(context('admin', ADMIN, ADMIN), store)).toBe(true);
    });

    it('can_get_all_score solo (sin can_get_score): también ve el propio', () => {
      const store = createDataStore(dir);

      expect(canGetScore(context('auditor', AUDITOR, AUDITOR), store)).toBe(true);
      expect(canGetScore(context('auditor', AUDITOR, USER_WITH_SCORE), store)).toBe(true);
    });

    it('can_get_score: puede ver su propio score', () => {
      expect(
        canGetScore(context('user', USER_WITH_SCORE, USER_WITH_SCORE), createDataStore(dir)),
      ).toBe(true);
    });

    it('can_get_score: no puede ver el de otro rut (exista o no)', () => {
      const store = createDataStore(dir);

      expect(canGetScore(context('user', USER_WITH_SCORE, ADMIN), store)).toBe(false);
      expect(canGetScore(context('user', USER_WITH_SCORE, USER_WITHOUT_SCORE), store)).toBe(false);
      expect(canGetScore(context('user', USER_WITH_SCORE, UNKNOWN_RUT), store)).toBe(false);
    });

    it('la autorización no depende de que exista un score (eso es un 404 posterior)', () => {
      expect(
        canGetScore(context('user', USER_WITHOUT_SCORE, USER_WITHOUT_SCORE), createDataStore(dir)),
      ).toBe(true);
    });

    it('sin permisos: denegado, incluso sobre su propio rut', () => {
      expect(canGetScore(context('guest', GUEST, GUEST), createDataStore(dir))).toBe(false);
    });

    it('un permiso negado explícitamente (value false) no concede', () => {
      expect(canGetScore(context('blocked', BLOCKED, BLOCKED), createDataStore(dir))).toBe(false);
    });

    it('un rol inexistente no tiene permisos', () => {
      expect(canGetScore(context('fantasma', GUEST, GUEST), createDataStore(dir))).toBe(false);
    });

    it('la comparación del rut propio es exacta', () => {
      const store = createDataStore(dir);

      expect(canGetScore(context('user', USER_WITH_SCORE, ' 22222222-2'), store)).toBe(false);
      expect(canGetScore(context('user', USER_WITH_SCORE, '22222222-2 '), store)).toBe(false);
      expect(canGetScore(context('user', USER_WITH_SCORE, '2222222-2'), store)).toBe(false);
    });

    it('el parámetro ausente no concede el acceso propio', () => {
      const ctx: AuthorizationContext = {
        user: { rut: USER_WITH_SCORE, role: 'user', active: true },
        params: {},
        query: { rut: USER_WITH_SCORE },
      };

      expect(canGetScore(ctx, createDataStore(dir))).toBe(false);
    });

    it('un cambio de permisos rige sin reiniciar', () => {
      const store = createDataStore(dir);
      expect(canGetScore(context('user', USER_WITH_SCORE, ADMIN), store)).toBe(false);

      writeDataFile(
        dir,
        'permissions',
        [
          { role: 'admin', key: 'can_get_score', value: true },
          { role: 'user', key: 'can_get_score', value: true },
          { role: 'user', key: 'can_get_all_score', value: true },
        ],
        3000,
      );

      expect(canGetScore(context('user', USER_WITH_SCORE, ADMIN), store)).toBe(true);
    });

    it('falla cerrado: con datos corruptos lanza en lugar de conceder', () => {
      const store = createDataStore(dir);
      store.load();
      writeDataFile(dir, 'permissions', '{ roto', 3000);

      expect(() => canGetScore(context('admin', ADMIN, ADMIN), store)).toThrow();
    });
  });
});
