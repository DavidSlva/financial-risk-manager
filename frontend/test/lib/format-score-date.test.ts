import { describe, expect, it } from 'vitest';

import { formatScoreDate } from '../../src/lib/format-score-date.js';

describe('formatScoreDate', () => {
  it('formatea en es-CL con la zona dada', () => {
    const out = formatScoreDate('2025-06-27T14:35:00Z', 'UTC');
    expect(out).toContain('27 de junio de 2025');
    expect(out).toContain('14:35');
  });
  it('usa la zona local si no se indica', () => {
    expect(formatScoreDate('2025-06-27T14:35:00Z')).toContain('2025');
  });
});
