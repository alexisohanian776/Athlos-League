/* Neon serverless Postgres. Tagged-template `sql` parameterises everything it
   interpolates, so values are never concatenated into the statement. */
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set — run `vercel env pull .env.local`.');
}

export const sql = neon(connectionString);
