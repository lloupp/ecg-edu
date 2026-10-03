import { runtimeConfig } from '../../src/data/runtime-config';
import { LiveService } from '../../src/modules/live/live.service';

describe('runtime safety', () => {
  it('blocks production startup even when PostgreSQL is configured', () => {
    expect(() => runtimeConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://localhost/db' })).toThrow(/Production API blocked/);
    expect(() => runtimeConfig({ NODE_ENV: 'production' })).toThrow(/Production API blocked/);
  });
  it('selects memory only when DATABASE_URL is absent, and rejects invalid URLs', () => {
    expect(runtimeConfig({}).databaseUrl).toBeUndefined();
    expect(runtimeConfig({ DATABASE_URL: 'postgresql://localhost/db' }).liveEnabled).toBe(false);
    expect(() => runtimeConfig({ DATABASE_URL: 'sqlite://db' })).toThrow();
  });
  it('does not create in-memory live sessions in PostgreSQL mode', () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://localhost/db';
    try {
      const service = new LiveService();
      expect(service.list()).toEqual([]);
      expect(() => service.start({ teacherId: 'u-teacher-1', title: 'Aula', questionIds: [] })).toThrow(/indisponíveis/);
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});
