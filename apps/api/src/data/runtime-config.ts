export function runtimeConfig(env: NodeJS.ProcessEnv = process.env) {
  // Fail closed until the separate clinical-governance and production-hardening gates are complete.
  if (env.NODE_ENV === 'production') {
    throw new Error('Production API blocked: formal clinical review and remaining production hardening are not complete.');
  }
  const databaseUrl = env.DATABASE_URL?.trim();
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('DATABASE_URL must use a PostgreSQL URL.');
  }
  return { databaseUrl, liveEnabled: !databaseUrl };
}
