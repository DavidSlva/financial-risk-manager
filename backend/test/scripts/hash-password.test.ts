import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { verifyPassword } from '../../src/services/password.service.js';

const script = fileURLToPath(new URL('../../scripts/hash-password.mjs', import.meta.url));

function run(input: string) {
  const result = spawnSync(process.execPath, [script], { input, encoding: 'utf8' });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

describe('scripts/hash-password', () => {
  it('imprime un hash scrypt con los parámetros por defecto que verifica la contraseña', async () => {
    const { code, out } = run('clave-correcta-1');

    expect(code).toBe(0);
    expect(out.trim()).toMatch(/^scrypt\$32768\$8\$3\$[A-Za-z0-9+/]+=*\$[A-Za-z0-9+/]+=*$/);
    await expect(verifyPassword('clave-correcta-1', out.trim())).resolves.toBe(true);
  });

  it('imprime solo el hash (una línea)', () => {
    const { out } = run('clave-correcta-1');

    expect(out.trimEnd().split('\n')).toHaveLength(1);
  });

  it.each([
    ['LF', 'clave-correcta-1\n'],
    ['CRLF', 'clave-correcta-1\r\n'],
  ])('descarta un único salto de línea final (%s)', async (_label, input) => {
    const { out } = run(input);

    await expect(verifyPassword('clave-correcta-1', out.trim())).resolves.toBe(true);
  });

  it('no recorta los espacios de la contraseña', async () => {
    const { out } = run('  con espacios  \n');

    await expect(verifyPassword('  con espacios  ', out.trim())).resolves.toBe(true);
    await expect(verifyPassword('con espacios', out.trim())).resolves.toBe(false);
  });

  it('formas Unicode equivalentes producen contraseñas equivalentes', async () => {
    const decomposed = 'canio-seguro'.replace('ni', 'ñi'); // ñ como n + tilde combinada
    const composed = decomposed.normalize('NFC');
    const { out } = run(decomposed);

    expect(decomposed).not.toBe(composed);
    await expect(verifyPassword(composed, out.trim())).resolves.toBe(true);
  });

  it.each([
    ['7 caracteres', 'a'.repeat(7)],
    ['129 caracteres', 'a'.repeat(129)],
    ['vacía', ''],
    ['solo un salto de línea', '\n'],
  ])('rechaza una contraseña inválida (%s): código 1, sin hash', (_label, input) => {
    const { code, out, err } = run(input);

    expect(code).toBe(1);
    expect(out).toBe('');
    expect(err).toMatch(/8 y 128/);
  });

  it.each([
    ['8 caracteres', 'a'.repeat(8)],
    ['128 caracteres', 'a'.repeat(128)],
  ])('acepta el límite (%s)', (_label, input) => {
    expect(run(input).code).toBe(0);
  });

  it('nunca repite la contraseña en la salida ni en los errores', () => {
    const ok = run('clave-secreta-123');
    const bad = run('corta');

    expect(ok.out + ok.err).not.toContain('clave-secreta-123');
    expect(bad.out + bad.err).not.toContain('corta\n');
  });
});
