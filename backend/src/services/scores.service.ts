import type { Score } from '../models/data.types.js';
import { getDataStore, type DataStore } from './data-store.service.js';

export function findScoreByRut(
  rut: string,
  store: DataStore = getDataStore(),
): Readonly<Score> | undefined {
  return store.load().scores.find((score) => score.rut === rut);
}
