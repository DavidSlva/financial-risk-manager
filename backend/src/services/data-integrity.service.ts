import type { DataFileName, Violation } from '../models/data.types.js';

/** Contenido ya parseado de cada archivo, sin ninguna garantía sobre su forma. */
export interface RawData {
  roles: unknown;
  users: unknown;
  scores: unknown;
}

type ColumnType = 'string' | 'boolean' | 'number';

interface TableSchema {
  file: DataFileName;
  columns: Record<string, ColumnType>;
  /** Columnas string que además deben ser no vacías y sin espacios en los extremos (IR-3). */
  keyColumns: string[];
}

const SCHEMAS = {
  roles: {
    file: 'roles.json',
    columns: { name: 'string', description: 'string' },
    keyColumns: ['name'],
  },
  users: {
    file: 'users.json',
    columns: { rut: 'string', role: 'string', active: 'boolean' },
    keyColumns: ['rut', 'role'],
  },
  scores: {
    file: 'scores.json',
    columns: { rut: 'string', score: 'number' },
    keyColumns: ['rut'],
  },
} as const satisfies Record<string, TableSchema>;

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function violation(file: DataFileName, rule: string, detail: string, row?: number): Violation {
  const where = row === undefined ? file : `${file}, fila ${row}`;
  return { file, ...(row === undefined ? {} : { row }), rule, message: `${where}: ${detail}` };
}

/** Valida IR-1, IR-2 e IR-3 de una tabla. Devuelve las filas estructuralmente válidas. */
function validateTable(
  schema: TableSchema,
  content: unknown,
  violations: Violation[],
): { rows: Row[]; usable: boolean } {
  if (!Array.isArray(content)) {
    violations.push(violation(schema.file, 'IR-1', 'debe ser un arreglo JSON'));
    return { rows: [], usable: false };
  }

  const rows: Row[] = [];
  let usable = true;
  content.forEach((item: unknown, index) => {
    if (!isRow(item)) {
      violations.push(violation(schema.file, 'IR-1', 'la fila debe ser un objeto', index));
      usable = false;
      return;
    }

    let structurallyValid = true;
    const expected = Object.keys(schema.columns);
    for (const name of Object.keys(item)) {
      if (!expected.includes(name)) {
        violations.push(violation(schema.file, 'IR-2', `columna no permitida "${name}"`, index));
        structurallyValid = false;
      }
    }
    for (const [name, type] of Object.entries(schema.columns)) {
      if (!(name in item)) {
        violations.push(violation(schema.file, 'IR-2', `falta la columna "${name}"`, index));
        structurallyValid = false;
      } else if (typeof item[name] !== type) {
        violations.push(
          violation(schema.file, 'IR-2', `"${name}" debe ser ${type} y no nulo`, index),
        );
        structurallyValid = false;
      }
    }
    if (!structurallyValid) {
      usable = false;
      return;
    }

    for (const name of schema.keyColumns) {
      const value = item[name] as string;
      if (value.trim() === '' || value !== value.trim()) {
        violations.push(
          violation(
            schema.file,
            'IR-3',
            `"${name}" no puede estar vacío ni tener espacios en los extremos`,
            index,
          ),
        );
        structurallyValid = false;
      }
    }
    if (structurallyValid) rows.push(item);
    else usable = false;
  });

  return { rows, usable };
}

/** Claves únicas (IR-4/5/6). Devuelve el conjunto de claves presentes. */
function checkUnique(
  file: DataFileName,
  rule: string,
  column: string,
  rows: Row[],
  violations: Violation[],
): Set<string> {
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const key = row[column] as string;
    if (seen.has(key)) {
      violations.push(violation(file, rule, `"${column}" duplicado: "${key}"`, index));
    }
    seen.add(key);
  });
  return seen;
}

/**
 * Valida la integridad referencial de roles, users y scores (reglas IR-1…IR-9 de la spec 006).
 * Función pura: acumula y devuelve todas las violaciones; arreglo vacío = datos íntegros.
 */
export function validateIntegrity(data: RawData): Violation[] {
  const violations: Violation[] = [];

  const roles = validateTable(SCHEMAS.roles, data.roles, violations);
  const users = validateTable(SCHEMAS.users, data.users, violations);
  const scores = validateTable(SCHEMAS.scores, data.scores, violations);

  const roleNames = checkUnique('roles.json', 'IR-4', 'name', roles.rows, violations);
  const userRuts = checkUnique('users.json', 'IR-5', 'rut', users.rows, violations);
  checkUnique('scores.json', 'IR-6', 'rut', scores.rows, violations);

  // Las claves foráneas solo se comprueban si la tabla padre es utilizable por completo;
  // si no, cada fila hija fallaría en cascada y ocultaría la causa real.
  if (roles.usable) {
    users.rows.forEach((row, index) => {
      if (!roleNames.has(row.role as string)) {
        violations.push(
          violation('users.json', 'IR-7', `"role" no existe en roles.json: "${row.role}"`, index),
        );
      }
    });
  }
  if (users.usable) {
    scores.rows.forEach((row, index) => {
      if (!userRuts.has(row.rut as string)) {
        violations.push(
          violation('scores.json', 'IR-8', `"rut" no existe en users.json: "${row.rut}"`, index),
        );
      }
    });
  }

  scores.rows.forEach((row, index) => {
    const score = row.score as number;
    if (!Number.isInteger(score) || score < 0 || score > 1000) {
      violations.push(
        violation('scores.json', 'IR-9', `"score" debe ser un entero entre 0 y 1000`, index),
      );
    }
  });

  return violations;
}
