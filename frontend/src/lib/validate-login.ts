import type { LoginCredentials } from '../api/login.types.js';
import { LOGIN_LIMITS } from '../config/login-limits.js';
import { normalizeRut } from './rut.js';

export type LoginLimits = {
  rut: { min: number; max: number };
  password: { min: number; max: number };
};

export type LoginValidation =
  | { ok: true; rut: string }
  | {
      ok: false;
      fieldErrors: { rut?: string; password?: string };
      firstInvalid: 'rut' | 'password';
    };

export function validateLogin(
  values: LoginCredentials,
  limits: LoginLimits = LOGIN_LIMITS,
): LoginValidation {
  const fieldErrors: { rut?: string; password?: string } = {};

  const rut = normalizeRut(values.rut);
  if (rut === null || rut.length < limits.rut.min || rut.length > limits.rut.max) {
    fieldErrors.rut = 'login.errors.rutInvalid';
  }

  const length = Array.from(values.password).length;
  if (length === 0) {
    fieldErrors.password = 'login.errors.passwordInvalid';
  } else if (length < limits.password.min || length > limits.password.max) {
    fieldErrors.password = 'login.errors.passwordLength';
  }

  if (fieldErrors.rut) return { ok: false, fieldErrors, firstInvalid: 'rut' };
  if (fieldErrors.password) return { ok: false, fieldErrors, firstInvalid: 'password' };
  return { ok: true, rut: rut as string };
}
