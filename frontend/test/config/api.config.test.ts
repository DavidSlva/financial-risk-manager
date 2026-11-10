import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(base?: string) {
  vi.resetModules();
  if (base !== undefined) vi.stubEnv('VITE_API_BASE_URL', base);
  return import('../../src/config/api.config.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('api.config', () => {
  it('usa /api por defecto', async () => {
    vi.stubEnv('VITE_API_BASE_URL', undefined as unknown as string);
    vi.resetModules();
    const mod = await import('../../src/config/api.config.js');
    expect(mod.API_BASE_URL).toBe('/api');
    expect(mod.apiUrl('/auth/login')).toBe('/api/auth/login');
  });

  it('con VITE_API_BASE_URL vacía usa /api', async () => {
    const { API_BASE_URL, apiUrl } = await load('');
    expect(API_BASE_URL).toBe('/api');
    expect(apiUrl('/score/12345678-5')).toBe('/api/score/12345678-5');
  });

  it('une base y path con una sola barra', async () => {
    const { apiUrl } = await load('/api/');
    expect(apiUrl('/auth/login')).toBe('/api/auth/login');
    expect(apiUrl('auth/login')).toBe('/api/auth/login');
  });

  it('funciona con base absoluta y quita la barra final', async () => {
    const { API_BASE_URL, apiUrl } = await load('http://localhost:8000/api/');
    expect(API_BASE_URL).toBe('http://localhost:8000/api');
    expect(apiUrl('/auth/login')).toBe('http://localhost:8000/api/auth/login');
  });
});
