import type { User } from '../models/data.types.js';
import { getDataStore, type DataStore } from './data-store.service.js';

/** Busca un usuario por rut. Incluye a los no vigentes: la decisión sobre `active` es de quien llama. */
export function findUserByRut(
  rut: string,
  store: DataStore = getDataStore(),
): Readonly<User> | undefined {
  return store.load().users.find((user) => user.rut === rut);
}
