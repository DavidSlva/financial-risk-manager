import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../../src/config/environment.js';

describe('config/environment', () => {
  it('aplica valores por defecto', () => {
    expect(parseEnvironment({})).toEqual({ nodeEnv: 'development', port: 3000 });
  });

  it('lee NODE_ENV y PORT', () => {
    expect(parseEnvironment({ NODE_ENV: 'production', PORT: '8080' })).toEqual({
      nodeEnv: 'production',
      port: 8080,
    });
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
