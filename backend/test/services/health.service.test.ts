import { describe, expect, it } from 'vitest';
import { getHealthStatus } from '../../src/services/health.service.js';

describe('health.service', () => {
  it('informa estado ok, uptime entero y fecha ISO', () => {
    const status = getHealthStatus();

    expect(status.status).toBe('ok');
    expect(Number.isInteger(status.uptimeSeconds)).toBe(true);
    expect(new Date(status.timestamp).toISOString()).toBe(status.timestamp);
  });
});
