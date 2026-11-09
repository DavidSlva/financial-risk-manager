/** Tipos del modelo de datos (spec 006). Solo tipos: sin lógica. */

export interface Role {
  name: string;
  description: string;
}

export interface User {
  rut: string;
  role: string;
  active: boolean;
}

export interface Score {
  rut: string;
  score: number;
}

export type DataFileName = 'roles.json' | 'users.json' | 'scores.json';

export interface Violation {
  file: DataFileName;
  /** Índice (desde 0) de la fila dentro del arreglo, si aplica. */
  row?: number;
  /** Id de la regla de integridad (IR-1…IR-9). */
  rule: string;
  message: string;
}

export interface DataSnapshot {
  roles: readonly Readonly<Role>[];
  users: readonly Readonly<User>[];
  scores: readonly Readonly<Score>[];
}
