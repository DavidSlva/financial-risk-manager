import type { User } from '../models/data.types.js';
import { getDataStore, type DataStore } from './data-store.service.js';

/** Busca un usuario por rut. Incluye a los no vigentes: la decisión sobre `active` es de quien llama. */
export function findUserByRut(
  rut: string,
  store: DataStore = getDataStore(),
): Readonly<User> | undefined {
  return store.load().users.find((user) => user.rut === rut);
}

/**
 * Reserva un intento de login (spec 009): incrementa de forma atómica el contador de intentos
 * fallidos **antes** de verificar la contraseña, para que las peticiones concurrentes no puedan
 * eludir el límite. Devuelve `false`, sin escribir, si el usuario no existe, no está vigente o ya
 * alcanzó el máximo (bloqueado).
 */
export function reserveLoginAttempt(
  rut: string,
  maxAttempts: number,
  store: DataStore = getDataStore(),
): Promise<boolean> {
  return store.updateUsers((users) => {
    const user = users.find((candidate) => candidate.rut === rut);
    if (!user?.active || user.failed_attempts >= maxAttempts) {
      return { users: null, result: false };
    }
    return {
      users: users.map((u) =>
        u.rut === rut ? { ...u, failed_attempts: u.failed_attempts + 1 } : { ...u },
      ),
      result: true,
    };
  });
}

/** Reinicia el contador de intentos (login exitoso). No escribe si ya estaba en 0. */
export async function resetLoginAttempts(
  rut: string,
  store: DataStore = getDataStore(),
): Promise<void> {
  await store.updateUsers((users) => {
    const user = users.find((candidate) => candidate.rut === rut);
    if (!user || user.failed_attempts === 0) return { users: null, result: undefined };
    return {
      users: users.map((u) => (u.rut === rut ? { ...u, failed_attempts: 0 } : { ...u })),
      result: undefined,
    };
  });
}
