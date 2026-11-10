import type { RawData } from './data-fixtures.js';

/**
 * Escenario de la consulta de score (spec 013).
 *
 * | rut          | rol     | vigente | score | permisos del rol                          |
 * | ------------ | ------- | ------- | ----- | ----------------------------------------- |
 * | 11111111-1   | admin   | sí      | 780   | can_get_score, can_get_all_score          |
 * | 22222222-2   | user    | sí      | 650   | can_get_score                             |
 * | 33333333-3   | user    | sí      | —     | can_get_score                             |
 * | 44444444-4   | guest   | sí      | —     | (ninguno)                                 |
 * | 55555555-5   | auditor | sí      | —     | can_get_all_score                         |
 * | 66666666-6   | blocked | sí      | —     | can_get_score: false (negado)             |
 * | 77777777-7   | admin   | no      | —     | can_get_score, can_get_all_score          |
 */
export const ADMIN = '11111111-1';
export const USER_WITH_SCORE = '22222222-2';
export const USER_WITHOUT_SCORE = '33333333-3';
export const GUEST = '44444444-4';
export const AUDITOR = '55555555-5';
export const BLOCKED = '66666666-6';
export const REVOKED_ADMIN = '77777777-7';
export const UNKNOWN_RUT = '99999999-9';

export function scoreScenario(): RawData {
  return {
    roles: [
      { name: 'admin', description: 'Administración' },
      { name: 'user', description: 'Usuario' },
      { name: 'guest', description: 'Sin permisos' },
      { name: 'auditor', description: 'Solo lectura global' },
      { name: 'blocked', description: 'Permiso propio negado' },
    ],
    users: [
      { rut: ADMIN, role: 'admin', active: true },
      { rut: USER_WITH_SCORE, role: 'user', active: true },
      { rut: USER_WITHOUT_SCORE, role: 'user', active: true },
      { rut: GUEST, role: 'guest', active: true },
      { rut: AUDITOR, role: 'auditor', active: true },
      { rut: BLOCKED, role: 'blocked', active: true },
      { rut: REVOKED_ADMIN, role: 'admin', active: false },
    ],
    scores: [
      { rut: ADMIN, score: 780 },
      { rut: USER_WITH_SCORE, score: 650 },
    ],
    permissions: [
      { role: 'admin', key: 'can_get_score', value: true },
      { role: 'admin', key: 'can_get_all_score', value: true },
      { role: 'user', key: 'can_get_score', value: true },
      { role: 'auditor', key: 'can_get_all_score', value: true },
      { role: 'blocked', key: 'can_get_score', value: false },
    ],
  };
}
