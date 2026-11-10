import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataStore } from '../../src/services/data-store.service.js';
import { findRoleByName } from '../../src/services/roles.service.js';
import { makeTempDir, validData, writeAll } from '../helpers/data-fixtures.js';

describe('roles.service', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('encuentra un rol por nombre', () => {
    expect(findRoleByName('admin', createDataStore(dir))).toEqual({
      name: 'admin',
      description: 'Administración de la plataforma',
    });
  });

  it('devuelve undefined si no existe', () => {
    expect(findRoleByName('invitado', createDataStore(dir))).toBeUndefined();
  });
});
