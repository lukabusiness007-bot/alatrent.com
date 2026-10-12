// Vercel functions have no shared persistent filesystem. Until an external
// database is configured, serve the seeded catalog without accepting writes.
export const catalogOnly = process.env.VERCEL === '1';

export const storageUnavailable =
  'Online rezervacije i izmene trenutno nisu dostupne. Pokušaj kasnije.';
