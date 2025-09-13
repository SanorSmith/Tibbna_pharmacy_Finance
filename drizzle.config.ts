import { defineConfig } from 'drizzle-kit';

const url = `${process.env.DATABASE_URL}?sslmode=require`;

export default defineConfig({
  schema: './lib/db/tables/*',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: url,
  },
});
