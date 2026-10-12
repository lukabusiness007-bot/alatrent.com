// Vercel functions have no shared persistent filesystem. Until an external
// database is configured, serve the seeded catalog without accepting writes.
export const persistentDatabase = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL);
export const catalogOnly = process.env.VERCEL === '1' && !persistentDatabase;

export const storageUnavailable =
  'Online rezervacije i izmene trenutno nisu dostupne. Pokušaj kasnije.';
