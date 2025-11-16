# Database Migrations

This directory contains SQL migration files for the database schema.

## Running Migrations

### Option 1: Using psql (PostgreSQL CLI)
```bash
psql -U your_username -d your_database -f migrations/001_create_departments_table.sql
```

### Option 2: Using Drizzle Kit
```bash
npx drizzle-kit push:pg
```

### Option 3: Manual execution
Copy the SQL from the migration file and execute it in your PostgreSQL client (e.g., pgAdmin, DBeaver, or Supabase SQL Editor).

## Migration Files

- `001_create_departments_table.sql` - Creates the departments table with contact information fields
