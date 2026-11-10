import { readFileSync, statSync } from 'node:fs';
import { rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { environment } from '../config/environment.js';
import type { DataFileName, DataSnapshot, User, Violation } from '../models/data.types.js';
import { validateIntegrity } from './data-integrity.service.js';

export class DataIntegrityError extends Error {
  constructor(public readonly violations: readonly Violation[]) {
    super(`Datos inválidos:\n${violations.map((v) => `  - [${v.rule}] ${v.message}`).join('\n')}`);
    this.name = 'DataIntegrityError';
  }
}

/** Resultado de una actualización de `users`: las filas nuevas (o `null` si no hay cambio) y un valor. */
export interface UsersUpdate<T> {
  users: readonly User[] | null;
  result: T;
}

export interface DataStore {
  /**
   * Devuelve los datos vigentes. Relee los archivos si cambió su fecha de modificación.
   * Falla cerrado: si los datos no son íntegros, lanza `DataIntegrityError`.
   */
  load(): DataSnapshot;

  /**
   * Actualiza `users.json` (spec 009). Las actualizaciones se serializan en una cola, parten de
   * los datos vigentes, validan la integridad del resultado **antes** de escribir y escriben de
   * forma atómica (archivo temporal + renombrado). Si `update` devuelve `users: null` no se
   * escribe. Falla cerrado: con datos no íntegros (antes o después del cambio) lanza
   * `DataIntegrityError` y no modifica el archivo.
   */
  updateUsers<T>(update: (users: readonly Readonly<User>[]) => UsersUpdate<T>): Promise<T>;
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

  function load(): DataSnapshot {
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
  }

  let queue: Promise<unknown> = Promise.resolve();

  async function applyUpdate<T>(
    update: (users: readonly Readonly<User>[]) => UsersUpdate<T>,
  ): Promise<T> {
    const snapshot = load();
    const outcome = update(snapshot.users);
    if (outcome.users === null) return outcome.result;

    const violations = validateIntegrity({
      roles: snapshot.roles,
      users: outcome.users,
      scores: snapshot.scores,
      permissions: snapshot.permissions,
    });
    if (violations.length > 0) throw new DataIntegrityError(violations);

    const target = join(dataDir, FILES.users);
    const temp = `${target}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(
        temp,
        `${JSON.stringify(outcome.users, null, 2)}
`,
        'utf8',
      );
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }

    // Dos escrituras en el mismo milisegundo podrían dejar la misma `mtime`: se descarta la caché.
    cached = undefined;
    cacheKey = undefined;
    return outcome.result;
  }

  return {
    load,
    updateUsers<T>(update: (users: readonly Readonly<User>[]) => UsersUpdate<T>): Promise<T> {
      const next = queue.then(() => applyUpdate(update));
      queue = next.catch(() => undefined);
      return next;
    },
  };
}

let defaultStore: DataStore | undefined;

/** Almacén de la aplicación, sobre `DATA_DIR`. Se crea la primera vez que se usa. */
export function getDataStore(): DataStore {
  defaultStore ??= createDataStore(environment.dataDir);
  return defaultStore;
}
