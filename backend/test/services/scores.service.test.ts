import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataStore } from '../../src/services/data-store.service.js';
import { findScoreByRut } from '../../src/services/scores.service.js';
import { makeTempDir, validData, writeAll } from '../helpers/data-fixtures.js';

describe('scores.service', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    writeAll(dir, validData(), 1000);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

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
