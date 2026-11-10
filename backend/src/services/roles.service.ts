import type { Role } from '../models/data.types.js';
import { getDataStore, type DataStore } from './data-store.service.js';

export function findRoleByName(
  name: string,
  store: DataStore = getDataStore(),
): Readonly<Role> | undefined {
  return store.load().roles.find((role) => role.name === name);
}
