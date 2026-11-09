import { describe, expect, it } from 'vitest';
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
    it.each(['roles', 'users', 'scores'] as const)('%s no es un arreglo', (file) => {
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
      ['score como texto', 'scores', [{ rut: '11111111-1', score: '780' }]],
      ['description numérica', 'roles', [{ name: 'admin', description: 5 }]],
      ['rut numérico', 'users', [{ rut: 111, role: 'admin', active: true }]],
    ] as const)('tipo incorrecto: %s', (_label, file, rows) => {
      const data = validData();
      data[file] = rows;

      expect(rulesOf(data)).toContain('IR-2');
    });
  });

  describe('IR-3: strings no vacíos y sin espacios en los extremos', () => {
    it.each([
      ['roles', 'name', [{ name: '', description: 'x' }]],
      ['users', 'rut', [{ rut: '', role: 'admin', active: true }]],
      ['users', 'rut', [{ rut: ' 11111111-1', role: 'admin', active: true }]],
      ['users', 'role', [{ rut: '11111111-1', role: 'admin ', active: true }]],
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
      data.users = [
        { rut: '11111111-1', role: 'admin', active: true },
        { rut: '11111111-1', role: 'user', active: true },
      ];

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
      data.users = [{ rut: '11111111-1', role: 'superadmin', active: true }];
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

  describe('IR-9: score entero entre 0 y 1000', () => {
    it.each([-1, 1001, 7.5, Number.NaN])('rechaza %s', (score) => {
      const data = validData();
      data.scores = [{ rut: '11111111-1', score }];

      expect(validateIntegrity(data)).toContainEqual(
        expect.objectContaining({ file: 'scores.json', row: 0, rule: 'IR-9' }),
      );
    });

    it.each([0, 1000, 650])('acepta %s', (score) => {
      const data = validData();
      data.scores = [{ rut: '11111111-1', score }];

      expect(validateIntegrity(data)).toEqual([]);
    });
  });

  it('acumula las violaciones de todos los archivos', () => {
    const data = validData();
    data.roles = [{ name: 'admin', description: 'a' }];
    data.users = [{ rut: '11111111-1', role: 'otro', active: true }];
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
