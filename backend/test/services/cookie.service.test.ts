import { describe, expect, it } from 'vitest';
import { parseCookies } from '../../src/services/cookie.service.js';

describe('cookie.service › parseCookies', () => {
  it('separa varias cookies', () => {
    expect(parseCookies('a=1; b=2; c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it.each([undefined, '', '   ', ';', ';;'])('devuelve {} para %j', (header) => {
    expect(parseCookies(header)).toEqual({});
  });

  it('tolera espacios alrededor y separadores sin espacio', () => {
    expect(parseCookies('  a=1;b=2 ;   c = 3 ')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('el valor puede contener "="', () => {
    expect(parseCookies('token=abc==; x=y')).toEqual({ token: 'abc==', x: 'y' });
  });

  it('quita las comillas que envuelven un valor', () => {
    expect(parseCookies('a="valor"')).toEqual({ a: 'valor' });
  });

  it('decodifica el valor codificado como URL', () => {
    expect(parseCookies('a=hola%20mundo')).toEqual({ a: 'hola mundo' });
  });

  it('un valor con codificación inválida se conserva tal cual (no lanza)', () => {
    expect(parseCookies('a=%E0%A4%A; b=ok')).toEqual({ a: '%E0%A4%A', b: 'ok' });
  });

  it.each(['sinigual', '=sinnombre', ' =x', 'a b=1'])('ignora lo mal formado: %j', (piece) => {
    expect(parseCookies(`${piece}; ok=1`)).toEqual({ ok: '1' });
  });

  it('ante nombres repetidos toma la primera ocurrencia', () => {
    expect(parseCookies('a=1; a=2')).toEqual({ a: '1' });
  });

  it('los nombres distinguen mayúsculas y minúsculas', () => {
    expect(parseCookies('Token=1; token=2')).toEqual({ Token: '1', token: '2' });
  });

  it('un valor vacío es válido', () => {
    expect(parseCookies('a=; b=2')).toEqual({ a: '', b: '2' });
  });

  it('no permite nombres que contaminan el prototipo', () => {
    const parsed = parseCookies('__proto__=x; constructor=y; ok=1');

    expect(Object.getPrototypeOf(parsed)).toBeNull();
    expect(parsed.ok).toBe('1');
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('un JWT completo (con puntos y guiones) se conserva intacto', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln-_bnT';

    expect(parseCookies(`access_token=${jwt}`)).toEqual({ access_token: jwt });
  });
});
