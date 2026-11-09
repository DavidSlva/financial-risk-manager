import type { JwtConfig } from '../../src/config/environment.js';

export const TEST_SECRET_HEX = 'ab'.repeat(64);

export function testJwtConfig(overrides: Partial<JwtConfig> = {}): JwtConfig {
  return {
    secret: Buffer.from(TEST_SECRET_HEX, 'hex'),
    algorithm: 'HS256',
    accessTtlSeconds: 900,
    refreshTtlSeconds: 604800,
    ...overrides,
  };
}
