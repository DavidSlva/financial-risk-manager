import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../../vite.config.js';

describe('vite.config', () => {
  it('usa el puerto 3000 sin strictPort', () => {
    expect(config.server?.port).toBe(3000);
    expect(config.server?.strictPort).toBeUndefined();
  });

  it('.env.development apunta al backend en localhost:8000', () => {
    const env = readFileSync(join(import.meta.dirname, '..', '..', '.env.development'), 'utf8');
    expect(env).toContain('VITE_API_BASE_URL=http://localhost:8000/api');
  });
});
