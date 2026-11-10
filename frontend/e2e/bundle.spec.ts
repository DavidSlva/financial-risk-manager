import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const run = promisify(execFile);
const FORBIDDEN = [
  'login-states',
  'LoginStatesPreview',
  'Reposo',
  'Texto largo',
  'Contraseña visible',
  'Error de formulario',
];

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
    ),
  );
  return nested.flat();
}

test('el bundle de producción no contiene la vista previa de estados', async () => {
  test.setTimeout(120_000);
  const outDir = await mkdtemp(join(tmpdir(), 'login-bundle-'));
  try {
    await run('pnpm', ['exec', 'vite', 'build', '--outDir', outDir, '--emptyOutDir'], {
      shell: true,
    });
    const files = await listFiles(outDir);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      for (const text of FORBIDDEN) {
        expect(content.includes(text), `${file} contiene "${text}"`).toBe(false);
      }
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
