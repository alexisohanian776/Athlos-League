/* Neon serverless Postgres. Tagged-template `sql` parameterises everything it
   interpolates, so values are never concatenated into the statement. */
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set — run `vercel env pull .env.local`.');
}

/* Next.js patches global fetch and caches its responses, and Neon's
   serverless driver talks over fetch — so query results were being cached
   in the Data Cache and replayed. It surfaced as a profile 404ing while the
   row plainly existed: the lookup for that handle had been cached as empty,
   and only novel query parameters missed the cache and reached the database.
   Every read is a live read. */
export const sql = neon(connectionString, {
  fetchOptions: { cache: 'no-store' },
});
