import { describe, expect, it } from 'vitest';
import {
  HTTP_ERRORS,
  HttpError,
  httpErrorTypeFromStatus,
  type HttpErrorType,
} from '../../src/config/http-errors.js';

describe('config/http-errors', () => {
  it('soporta exactamente los tipos esperados con su status', () => {
    expect(Object.fromEntries(Object.entries(HTTP_ERRORS).map(([k, v]) => [k, v.status]))).toEqual({
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      INTERNAL_SERVER_ERROR: 500,
    });
  });

  it('cada tipo tiene un mensaje genérico no vacío', () => {
    for (const definition of Object.values(HTTP_ERRORS)) {
      expect(definition.message.length).toBeGreaterThan(0);
    }
  });

  it('UNAUTHORIZED indica el esquema Bearer', () => {
    expect(HTTP_ERRORS.UNAUTHORIZED.headers).toEqual({ 'WWW-Authenticate': 'Bearer' });
  });

  describe('HttpError', () => {
    it('es un Error con su tipo y el mensaje del mapa', () => {
      const error = new HttpError('FORBIDDEN');

      expect(error).toBeInstanceOf(Error);
      expect(error.type).toBe('FORBIDDEN');
      expect(error.message).toBe(HTTP_ERRORS.FORBIDDEN.message);
      expect(error.name).toBe('HttpError');
    });

    it.each(Object.keys(HTTP_ERRORS) as HttpErrorType[])('se puede crear para %s', (type) => {
      expect(new HttpError(type).type).toBe(type);
    });
  });

  describe('httpErrorTypeFromStatus', () => {
    it.each([
      [400, 'BAD_REQUEST'],
      [401, 'UNAUTHORIZED'],
      [403, 'FORBIDDEN'],
      [404, 'NOT_FOUND'],
      [500, 'INTERNAL_SERVER_ERROR'],
    ])('status %i → %s', (status, type) => {
      expect(httpErrorTypeFromStatus(status)).toBe(type);
    });

    it.each([418, 413, 200, '400', undefined, null, Number.NaN])(
      'devuelve undefined para %j',
      (status) => {
        expect(httpErrorTypeFromStatus(status)).toBeUndefined();
      },
    );
  });
});
