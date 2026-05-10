import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(`${process.env.DATABASE_URL}?sslmode=require`);
export const db = drizzle(client, { schema });

// Export the raw client for cleanup purposes
export const rawClient = client;
