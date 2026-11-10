import { describe, expect, it } from 'vitest';
import { userRow } from '../helpers/user-fixtures.js';
import { validateIntegrity } from '../../src/services/data-integrity.service.js';
import { validData } from '../helpers/data-fixtures.js';

function rulesOf(data: ReturnType<typeof validData>): string[] {
  return validateIntegrity(data).map((v) => v.rule);
}

describe('data-integrity.service', () => {
  it('no informa violaciones con datos válidos', () => {
    expect(validateIntegrity(validData())).toEqual([]);
  });

  it('acepta usuarios sin score y roles sin usuarios', () => {
    const data = validData();
    data.scores = [];
    data.users = [];

    expect(validateIntegrity(data)).toEqual([]);
  });

  describe('IR-1: cada archivo es un arreglo de objetos', () => {
    it.each(['roles', 'users', 'scores', 'permissions'] as const)('%s no es un arreglo', (file) => {
      const data = validData();
      data[file] = { no: 'arreglo' };

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: `${file}.json`, rule: 'IR-1' }),
      );
    });

    it('una fila que no es objeto', () => {
      const data = validData();
      data.users = ['11111111-1'];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'users.json', row: 0, rule: 'IR-1' }),
      );
    });

    it('no genera violaciones de clave foránea en cascada si el padre no es un arreglo', () => {
      const data = validData();
      data.roles = null;

      expect(rulesOf(data)).toEqual(['IR-1']);
    });
  });

  describe('IR-2: columnas exactas y tipos correctos', () => {
    it('falta una columna', () => {
      const data = validData();
      data.users = [{ rut: '11111111-1', role: 'admin' }];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'users.json', row: 0, rule: 'IR-2' }),
      );
    });

    it('sobra una columna', () => {
      const data = validData();
      data.users = [{ rut: '11111111-1', role: 'admin', active: true, email: 'x@y.cl' }];

      expect(rulesOf(data)).toContain('IR-2');
    });

    it.each([
      ['active como texto', 'users', [{ rut: '1-9', role: 'admin', active: 'true' }]],
      ['active nulo', 'users', [{ rut: '1-9', role: 'admin', active: null }]],
      ['score como texto', 'scores', [{ rut: '11111111-1', score: '78' }]],
      ['description numérica', 'roles', [{ name: 'admin', description: 5 }]],
      ['rut numérico', 'users', [userRow(111, 'admin', true)]],
    ] as const)('tipo incorrecto: %s', (_label, file, rows) => {
      const data = validData();
      data[file] = rows;

      expect(rulesOf(data)).toContain('IR-2');
    });
  });

  describe('IR-3: strings no vacíos y sin espacios en los extremos', () => {
    it.each([
      ['roles', 'name', [{ name: '', description: 'x' }]],
      ['users', 'rut', [userRow('', 'admin', true)]],
      ['users', 'rut', [userRow(' 11111111-1', 'admin', true)]],
      ['users', 'role', [userRow('11111111-1', 'admin ', true)]],
      ['scores', 'rut', [{ rut: '  ', score: 10 }]],
    ] as const)('%s.%s inválido', (file, _column, rows) => {
      const data = validData();
      data[file] = rows;

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: `${file}.json`, rule: 'IR-3' }),
      );
    });
  });

  describe('claves primarias únicas', () => {
    it('IR-4: roles.name duplicado', () => {
      const data = validData();
      data.roles = [
        { name: 'admin', description: 'a' },
        { name: 'admin', description: 'b' },
      ];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'roles.json', row: 1, rule: 'IR-4' }),
      );
    });

    it('IR-5: users.rut duplicado', () => {
      const data = validData();
      data.users = [userRow('11111111-1', 'admin', true), userRow('11111111-1', 'user', true)];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'users.json', row: 1, rule: 'IR-5' }),
      );
    });

    it('IR-6: scores.rut duplicado', () => {
      const data = validData();
      data.scores = [
        { rut: '11111111-1', score: 1 },
        { rut: '11111111-1', score: 2 },
      ];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'scores.json', row: 1, rule: 'IR-6' }),
      );
    });
  });

  describe('claves foráneas', () => {
    it('IR-7: users.role inexistente en roles', () => {
      const data = validData();
      data.users = [userRow('11111111-1', 'superadmin', true)];
      data.scores = [];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'users.json', row: 0, rule: 'IR-7' }),
      );
    });

    it('IR-8: scores.rut inexistente en users', () => {
      const data = validData();
      data.scores = [{ rut: '99999999-9', score: 500 }];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'scores.json', row: 0, rule: 'IR-8' }),
      );
    });
  });

  describe('IR-9: score entero entre 0 y 100', () => {
    it.each([-1, 101, 1000, 780, 7.5, Number.NaN])('rechaza %s', (score) => {
      const data = validData();
      data.scores = [{ rut: '11111111-1', score }];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'scores.json', row: 0, rule: 'IR-9' }),
      );
    });

    it.each([0, 100, 65])('acepta %s', (score) => {
      const data = validData();
      data.scores = [{ rut: '11111111-1', score }];

      expect(validateIntegrity(data)).toEqual([]);
    });
  });

  describe('permissions', () => {
    it('acepta un rol sin permisos', () => {
      const data = validData();
      data.permissions = [];

      expect(validateIntegrity(data)).toEqual([]);
    });

    it('IR-2: falta una columna, sobra una o el tipo es incorrecto', () => {
      for (const row of [
        { role: 'admin', key: 'can_get_score' },
        { role: 'admin', key: 'can_get_score', value: true, extra: 1 },
        { role: 'admin', key: 'can_get_score', value: 'true' },
        { role: 'admin', key: 'can_get_score', value: null },
      ]) {
        const data = validData();
        data.permissions = [row];

        expect(rulesOf(data)).toContain('IR-2');
      }
    });

    it('IR-3: role y key no vacíos y sin espacios en los extremos', () => {
      for (const row of [
        { role: '', key: 'can_get_score', value: true },
        { role: 'admin', key: ' can_get_score', value: true },
      ]) {
        const data = validData();
        data.permissions = [row];

        expect(validateIntegrity(data)).toContainEqual(
          expect.objectContaining({ file: 'permissions.json', rule: 'IR-3' }),
        );
      }
    });

    it('IR-10: (role, key) duplicado', () => {
      const data = validData();
      data.permissions = [
        { role: 'admin', key: 'can_get_score', value: true },
        { role: 'admin', key: 'can_get_score', value: false },
      ];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'permissions.json', row: 1, rule: 'IR-10' }),
      );
    });

    it('IR-10: la misma clave en roles distintos no es duplicado', () => {
      const data = validData();

      expect(rulesOf(data)).not.toContain('IR-10');
    });

    it('IR-11: role inexistente en roles', () => {
      const data = validData();
      data.permissions = [{ role: 'fantasma', key: 'can_get_score', value: true }];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'permissions.json', row: 0, rule: 'IR-11' }),
      );
    });

    it('IR-12: key fuera del catálogo de permisos', () => {
      const data = validData();
      data.permissions = [{ role: 'admin', key: 'can_delete_everything', value: true }];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'permissions.json', row: 0, rule: 'IR-12' }),
      );
    });

    it('IR-12: el nombre con espacios no es una clave del catálogo', () => {
      const data = validData();
      data.permissions = [{ role: 'admin', key: 'can get score', value: true }];

      expect(rulesOf(data)).toContain('IR-12');
    });

    it('no genera IR-11 en cascada si roles.json no es un arreglo', () => {
      const data = validData();
      data.roles = null;

      expect(rulesOf(data)).toEqual(['IR-1']);
    });
  });

  describe('IR-13: rut con formato canónico y dígito verificador válido', () => {
    it.each(['12345678-4', '12.345.678-5', '123456785', '1000005-k', '012345678-5'])(
      'users.rut inválido %j',
      (rut) => {
        const data = validData();
        data.users = [userRow(rut, 'admin', true)];
        data.scores = [];

        expect(validateIntegrity(data)).toContainEqual(
          expect.objectContaining({ file: 'users.json', row: 0, rule: 'IR-13' }),
        );
      },
    );

    it('scores.rut inválido', () => {
      const data = validData();
      data.scores = [{ rut: '11111111-2', score: 500 }];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'scores.json', row: 0, rule: 'IR-13' }),
      );
    });

    it('acepta RUT con DV K y DV 0', () => {
      const data = validData();
      data.users = [userRow('1000005-K', 'admin', true), userRow('1000030-0', 'user', true)];
      data.scores = [{ rut: '1000005-K', score: 70 }];

      expect(validateIntegrity(data)).toEqual([]);
    });

    it('no duplica la violación cuando la fila ya falla IR-2 o IR-3', () => {
      const data = validData();
      data.users = [userRow(12345678, 'admin', true), userRow(' 11111111-1', 'admin', true)];
      data.scores = [];

      expect(rulesOf(data)).not.toContain('IR-13');
    });
  });

  describe('contraseña e intentos fallidos (spec 009)', () => {
    it('IR-2: faltan password_hash o failed_attempts', () => {
      for (const missing of ['password_hash', 'failed_attempts']) {
        const row = userRow('11111111-1', 'admin', true);
        delete row[missing];
        const data = validData();
        data.users = [row];
        data.scores = [];

        expect(validateIntegrity(data)).toContainEqual(
          expect.objectContaining({ file: 'users.json', row: 0, rule: 'IR-2' }),
        );
      }
    });

    it.each([
      ['password_hash numérico', { password_hash: 123 }],
      ['failed_attempts como texto', { failed_attempts: '0' }],
      ['failed_attempts nulo', { failed_attempts: null }],
    ])('IR-2: tipo incorrecto (%s)', (_label, overrides) => {
      const data = validData();
      data.users = [userRow('11111111-1', 'admin', true, overrides)];
      data.scores = [];

      expect(rulesOf(data)).toContain('IR-2');
    });

    it.each([
      '',
      'una-clave-en-claro',
      'bcrypt$1024$8$1$c2FsdA==$aGFzaA==',
      'scrypt$1000$8$1$c2FsdA==$aGFzaA==',
      'scrypt$1024$8$1$c2FsdA==',
    ])('IR-14: password_hash con formato inválido %j', (hash) => {
      const data = validData();
      data.users = [userRow('11111111-1', 'admin', true, { password_hash: hash })];
      data.scores = [];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'users.json', row: 0, rule: 'IR-14' }),
      );
    });

    it('IR-14: el mensaje no incluye el valor del hash', () => {
      const data = validData();
      data.users = [userRow('11111111-1', 'admin', true, { password_hash: 'secreto-en-claro' })];
      data.scores = [];

      const violation = validateIntegrity(data).find((v) => v.rule === 'IR-14');

      expect(violation?.message).not.toContain('secreto-en-claro');
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      'IR-15: failed_attempts inválido %s',
      (attempts) => {
        const data = validData();
        data.users = [userRow('11111111-1', 'admin', true, { failed_attempts: attempts })];
        data.scores = [];

        expect(validateIntegrity(data)).toContainEqual(
          expect.objectContaining({ file: 'users.json', row: 0, rule: 'IR-15' }),
        );
      },
    );

    it.each([0, 1, 5, 100])('acepta failed_attempts %s', (attempts) => {
      const data = validData();
      data.users = [userRow('11111111-1', 'admin', true, { failed_attempts: attempts })];
      data.scores = [];

      expect(validateIntegrity(data)).toEqual([]);
    });

    it('no duplica violaciones cuando la fila ya falla IR-2', () => {
      const data = validData();
      data.users = [
        userRow('11111111-1', 'admin', true, { failed_attempts: '0', password_hash: 5 }),
      ];
      data.scores = [];

      expect(rulesOf(data)).not.toContain('IR-14');
      expect(rulesOf(data)).not.toContain('IR-15');
    });
  });

  it('acumula las violaciones de todos los archivos', () => {
    const data = validData();
    data.roles = [{ name: 'admin', description: 'a' }];
    data.users = [userRow('11111111-1', 'otro', true)];
    data.permissions = [];
    data.scores = [{ rut: '99999999-9', score: 5000 }];

    expect(rulesOf(data).sort()).toEqual(['IR-7', 'IR-8', 'IR-9']);
  });

  it('el mensaje identifica archivo y fila', () => {
    const data = validData();
    data.scores = [{ rut: '99999999-9', score: 500 }];

    const [violation] = validateIntegrity(data);

    expect(violation?.message).toContain('scores.json');
    expect(violation?.message).toContain('fila 0');
  });
});
