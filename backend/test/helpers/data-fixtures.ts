import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { userRow } from './user-fixtures.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface RawData {
  roles: unknown;
  users: unknown;
  scores: unknown;
  permissions: unknown;
}

export type DataTable = keyof RawData;

/** Conjunto de datos válido; cada prueba lo modifica para provocar una violación concreta. */
export function validData(): RawData {
  return {
    roles: [
      { name: 'admin', description: 'Administración de la plataforma' },
      { name: 'user', description: 'Consulta de su propio score' },
    ],
    users: [userRow('11111111-1', 'admin', true), userRow('22222222-2', 'user', false)],
    scores: [{ rut: '11111111-1', score: 78 }],
    permissions: [
      { role: 'admin', key: 'can_get_score', value: true },
      { role: 'admin', key: 'can_get_all_score', value: true },
      { role: 'user', key: 'can_get_score', value: true },
    ],
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
  name: DataTable,
  content: unknown,
  mtimeSeconds: number,
): void {
  const path = join(dir, `${name}.json`);
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
  utimesSync(path, mtimeSeconds, mtimeSeconds);
}

export function writeAll(dir: string, data: RawData, mtimeSeconds: number): void {
  for (const table of Object.keys(data) as DataTable[]) {
    writeDataFile(dir, table, data[table], mtimeSeconds);
  }
}
