export function runtimeConfig(env: NodeJS.ProcessEnv = process.env) {
  // Fail closed: durable data does not make the existing mock identity safe.
  if (env.NODE_ENV === 'production') {
    throw new Error('Production API blocked: real authentication, authorization and clinical review are not implemented.');
  }
  const databaseUrl = env.DATABASE_URL?.trim();
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error('DATABASE_URL must use a PostgreSQL URL.');
  }
  return { databaseUrl, liveEnabled: !databaseUrl };
}
