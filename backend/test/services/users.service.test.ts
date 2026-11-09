import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataStore } from '../../src/services/data-store.service.js';
import { findUserByRut } from '../../src/services/users.service.js';
import { makeTempDir, validData, writeAll } from '../helpers/data-fixtures.js';

describe('users.service', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('encuentra un usuario por rut', () => {
    expect(findUserByRut('11111111-1', createDataStore(dir))).toEqual({
      rut: '11111111-1',
      role: 'admin',
      active: true,
    });
  });

  it('devuelve también a los usuarios no vigentes (decide quien llama)', () => {
    expect(findUserByRut('22222222-2', createDataStore(dir))?.active).toBe(false);
  });

  it('devuelve undefined si no existe', () => {
    expect(findUserByRut('99999999-9', createDataStore(dir))).toBeUndefined();
  });
});
