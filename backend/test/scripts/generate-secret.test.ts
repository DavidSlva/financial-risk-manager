import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../../src/config/environment.js';

const script = fileURLToPath(new URL('../../scripts/generate-secret.mjs', import.meta.url));

function run(): string {
  return execFileSync(process.execPath, [script], { encoding: 'utf8' }).trim();
}

describe('scripts/generate-secret', () => {
  it('imprime 64 bytes aleatorios en hexadecimal (128 caracteres)', () => {
    expect(run()).toMatch(/^[0-9a-f]{128}$/);
  });

  it('genera una clave distinta en cada ejecución', () => {
    expect(run()).not.toBe(run());
  });

  it('la clave generada es aceptada por la configuración', () => {
    expect(() => parseEnvironment({ JWT_SECRET: run() })).not.toThrow();
  });
});
