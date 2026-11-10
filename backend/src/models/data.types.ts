/** Tipos del modelo de datos (spec 006). Solo tipos: sin lógica. */

export interface Role {
  name: string;
  description: string;
}

export interface User {
  rut: string;
  role: string;
  active: boolean;
  /** Hash scrypt de la contraseña (spec 009). Nunca sale de la capa de datos. */
  password_hash: string;
  /** Intentos de login fallidos desde el último login exitoso (spec 009). */
  failed_attempts: number;
}

/** Usuario autenticado tal como lo ve el resto de la app: sin el hash ni el contador. */
export type AuthenticatedUser = Omit<User, 'password_hash' | 'failed_attempts'>;

export interface Score {
  rut: string;
  score: number;
}

export interface Permission {
  role: string;
  key: string;
  value: boolean;
}

export type DataFileName = 'roles.json' | 'users.json' | 'scores.json' | 'permissions.json';

export interface Violation {
  file: DataFileName;
  /** Índice (desde 0) de la fila dentro del arreglo, si aplica. */
  row?: number;
  /** Id de la regla de integridad (IR-1…IR-12). */
  rule: string;
  message: string;
}

export interface DataSnapshot {
  roles: readonly Readonly<Role>[];
  users: readonly Readonly<User>[];
  scores: readonly Readonly<Score>[];
  permissions: readonly Readonly<Permission>[];
}
