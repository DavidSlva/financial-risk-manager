import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { environment } from '../config/environment.js';
import type { DataFileName, DataSnapshot, Violation } from '../models/data.types.js';
import { validateIntegrity } from './data-integrity.service.js';

export class DataIntegrityError extends Error {
  constructor(public readonly violations: readonly Violation[]) {
    super(`Datos inválidos:\n${violations.map((v) => `  - [${v.rule}] ${v.message}`).join('\n')}`);
    this.name = 'DataIntegrityError';
  }
}

export interface DataStore {
  /**
   * Devuelve los datos vigentes. Relee los archivos si cambió su fecha de modificación.
   * Falla cerrado: si los datos no son íntegros, lanza `DataIntegrityError`.
   */
  load(): DataSnapshot;
}

type Table = 'roles' | 'users' | 'scores' | 'permissions';

const FILES: Record<Table, DataFileName> = {
  roles: 'roles.json',
  users: 'users.json',
  scores: 'scores.json',
  permissions: 'permissions.json',
};

function deepFreezeRows<T extends object>(rows: readonly T[]): readonly Readonly<T>[] {
  rows.forEach((row) => Object.freeze(row));
  return Object.freeze(rows);
}

export function createDataStore(dataDir: string): DataStore {
  let cacheKey: string | undefined;
  let cached: { snapshot: DataSnapshot } | { error: DataIntegrityError } | undefined;

  function readRaw(violations: Violation[]): Record<Table, unknown> {
    const raw: Record<string, unknown> = {};
    for (const [table, file] of Object.entries(FILES)) {
      try {
        raw[table] = JSON.parse(readFileSync(join(dataDir, file), 'utf8'));
      } catch (error) {
        const reason =
          (error as NodeJS.ErrnoException).code === 'ENOENT'
            ? 'archivo no encontrado'
            : 'JSON inválido';
        violations.push({ file, rule: 'IR-1', message: `${file}: ${reason}` });
      }
    }
    return raw as Record<Table, unknown>;
  }

  function keyFor(): string {
    return Object.values(FILES)
      .map((file) => {
        try {
          const stats = statSync(join(dataDir, file));
          return `${stats.mtimeMs}:${stats.size}`;
        } catch {
          return 'missing';
        }
      })
      .join('|');
  }

  return {
    load(): DataSnapshot {
      const key = keyFor();
      if (cached === undefined || key !== cacheKey) {
        const violations: Violation[] = [];
        const raw = readRaw(violations);
        if (violations.length === 0) violations.push(...validateIntegrity(raw));

        cacheKey = key;
        cached =
          violations.length > 0
            ? { error: new DataIntegrityError(violations) }
            : {
                snapshot: Object.freeze({
                  roles: deepFreezeRows(raw.roles as DataSnapshot['roles'][number][]),
                  users: deepFreezeRows(raw.users as DataSnapshot['users'][number][]),
                  scores: deepFreezeRows(raw.scores as DataSnapshot['scores'][number][]),
                  permissions: deepFreezeRows(
                    raw.permissions as DataSnapshot['permissions'][number][],
                  ),
                }),
              };
      }

      if ('error' in cached) throw cached.error;
      return cached.snapshot;
    },
  };
}

let defaultStore: DataStore | undefined;

/** Almacén de la aplicación, sobre `DATA_DIR`. Se crea la primera vez que se usa. */
export function getDataStore(): DataStore {
  defaultStore ??= createDataStore(environment.dataDir);
  return defaultStore;
}
