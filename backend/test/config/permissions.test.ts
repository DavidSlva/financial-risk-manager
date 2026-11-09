import { describe, expect, it } from 'vitest';
import { PERMISSIONS, isPermissionKey } from '../../src/config/permissions.js';

describe('config/permissions', () => {
  it('el catálogo tiene exactamente los dos permisos definidos', () => {
    expect(PERMISSIONS).toEqual({
      CAN_GET_SCORE: 'can_get_score',
      CAN_GET_ALL_SCORE: 'can_get_all_score',
    });
  });

  it.each(['can_get_score', 'can_get_all_score'])('%s es un permiso válido', (key) => {
    expect(isPermissionKey(key)).toBe(true);
  });

  it.each(['can get score', 'CAN_GET_SCORE', 'can_get_scores', '', 'admin', null, undefined, 1])(
    'rechaza %j',
    (value) => {
      expect(isPermissionKey(value)).toBe(false);
    },
  );
});
