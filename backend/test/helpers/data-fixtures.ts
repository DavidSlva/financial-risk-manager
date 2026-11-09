import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface RawData {
  roles: unknown;
  users: unknown;
  scores: unknown;
}

/** Conjunto de datos válido; cada prueba lo modifica para provocar una violación concreta. */
export function validData(): RawData {
  return {
    roles: [
      { name: 'admin', description: 'Administración de la plataforma' },
      { name: 'user', description: 'Consulta de su propio score' },
    ],
    users: [
      { rut: '11111111-1', role: 'admin', active: true },
      { rut: '22222222-2', role: 'user', active: false },
    ],
    scores: [{ rut: '11111111-1', score: 780 }],
  };
}

export function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'frm-data-'));
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Escribe un archivo de datos. `mtimeSeconds` fija la fecha de modificación para que las
 * pruebas de recarga no dependan de la resolución del reloj del sistema de archivos.
 */
export function writeDataFile(
  dir: string,
  name: 'roles' | 'users' | 'scores',
  content: unknown,
  mtimeSeconds: number,
): void {
  const path = join(dir, `${name}.json`);
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
  utimesSync(path, mtimeSeconds, mtimeSeconds);
}

export function writeAll(dir: string, data: RawData, mtimeSeconds: number): void {
  writeDataFile(dir, 'roles', data.roles, mtimeSeconds);
  writeDataFile(dir, 'users', data.users, mtimeSeconds);
  writeDataFile(dir, 'scores', data.scores, mtimeSeconds);
}
