import { isAbsolute, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../../src/config/environment.js';

describe('config/environment', () => {
  it('aplica valores por defecto', () => {
    expect(parseEnvironment({})).toMatchObject({ nodeEnv: 'development', port: 3000 });
  });

  it('lee NODE_ENV y PORT', () => {
    expect(parseEnvironment({ NODE_ENV: 'production', PORT: '8080' })).toMatchObject({
      nodeEnv: 'production',
      port: 8080,
    });
  });

  it('DATA_DIR por defecto es la carpeta backend/data (ruta absoluta)', () => {
    const { dataDir } = parseEnvironment({});

    expect(isAbsolute(dataDir)).toBe(true);
    expect(dataDir.replaceAll('\\', '/')).toMatch(/\/backend\/data$/);
  });

  it('DATA_DIR configurable, resuelto a ruta absoluta', () => {
    expect(parseEnvironment({ DATA_DIR: 'otra/carpeta' }).dataDir).toBe(resolve('otra/carpeta'));
  });

  it('rechaza DATA_DIR vacío', () => {
    expect(() => parseEnvironment({ DATA_DIR: '  ' })).toThrow(/DATA_DIR/);
  });

  it.each(['0', '65536', 'abc', '3.5', ''])('rechaza PORT inválido %j', (port) => {
    expect(() => parseEnvironment({ PORT: port })).toThrow(/PORT/);
  });

  it('rechaza NODE_ENV desconocido', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('informa todos los errores a la vez', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'x', PORT: 'y' })).toThrow(/NODE_ENV[\s\S]*PORT/);
  });
});
