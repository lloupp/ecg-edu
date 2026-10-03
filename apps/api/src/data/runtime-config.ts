export function runtimeConfig(env: NodeJS.ProcessEnv = process.env) {
  // Authenticated identity is implemented; clinical review and production hardening remain release gates.
  if (env.NODE_ENV === 'production') {
    throw new Error('Production API blocked: clinical review, account verification/recovery and distributed authentication limits remain pending.');
  }
  const databaseUrl = env.DATABASE_URL?.trim();
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('DATABASE_URL must use a PostgreSQL URL.');
  }
  return { databaseUrl, liveEnabled: !databaseUrl };
}
