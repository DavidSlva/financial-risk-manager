import { describe, expect, it } from 'vitest';

describe('entorno de pruebas', () => {
  it('entorno de pruebas tiene DOM', () => {
    expect(typeof document).not.toBe('undefined');
    expect(document.createElement('div')).toBeInstanceOf(HTMLDivElement);
  });
});
