import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get all columns for all tables
async function getAllTableColumns() {
  const result = await pool.query(`
    SELECT 
      table_name,
      column_name,
      data_type
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  
  const tables = {};
  result.rows.forEach(row => {
    if (!tables[row.table_name]) {
      tables[row.table_name] = [];
    }
    tables[row.table_name].push(row.column_name);
  });
  
  return tables;
}

// Extract column references from SQL queries
function extractColumnsFromSQL(sql) {
  const columns = new Set();
  
  // Match INSERT INTO table (col1, col2, ...)
  const insertMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/gi);
  if (insertMatch) {
    insertMatch.forEach(match => {
      const cols = match.match(/\(([^)]+)\)/)[1];
      cols.split(',').forEach(col => {
        const cleaned = col.trim().replace(/["`]/g, '');
        if (cleaned && !cleaned.includes('$')) {
          columns.add(cleaned);
        }
      });
    });
  }
  
  // Match UPDATE table SET col1 = ..., col2 = ...
  const updateMatch = sql.match(/UPDATE\s+\w+\s+SET\s+([^W][^H][^E][^R][^E])+/gi);
  if (updateMatch) {
    updateMatch.forEach(match => {
      const setPart = match.split('SET')[1];
      if (setPart) {
        const assignments = setPart.split(',');
        assignments.forEach(assign => {
          const colMatch = assign.trim().match(/^(\w+)\s*=/);
          if (colMatch) {
            columns.add(colMatch[1]);
          }
        });
      }
    });
  }
  
  return Array.from(columns);
}

// Scan all API route files
async function scanAPIRoutes(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      await scanAPIRoutes(fullPath, files);
    } else if (item === 'route.ts' || item === 'route.js') {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function checkMissingColumns() {
  try {
    console.log("\n🔍 Checking for missing columns in API routes...\n");
    
    // Get actual database schema
    const dbSchema = await getAllTableColumns();
    
    console.log("📋 Database tables found:");
    Object.keys(dbSchema).sort().forEach(table => {
      console.log(`  - ${table} (${dbSchema[table].length} columns)`);
    });
    console.log();
    
    // Scan all API routes
    const apiDir = path.join(__dirname, '..', 'app', 'api');
    const routeFiles = await scanAPIRoutes(apiDir);
    
    console.log(`📂 Found ${routeFiles.length} API route files\n`);
    
    const issues = [];
    
    // Check each route file
    for (const file of routeFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relativePath = file.replace(path.join(__dirname, '..'), '');
      
      // Find SQL queries
      const sqlQueries = content.match(/`[^`]*(?:INSERT|UPDATE|SELECT)[^`]*`/gi) || [];
      
      for (const query of sqlQueries) {
        // Extract table name
        const tableMatch = query.match(/(?:INSERT\s+INTO|UPDATE|FROM|JOIN)\s+(\w+)/i);
        if (!tableMatch) continue;
        
        const tableName = tableMatch[1];
        if (!dbSchema[tableName]) continue;
        
        // Extract columns used in query
        const usedColumns = extractColumnsFromSQL(query);
        
        // Check for missing columns
        const missingColumns = usedColumns.filter(col => 
          !dbSchema[tableName].includes(col) && 
          col !== 'id' && 
          !col.startsWith('$')
        );
        
        if (missingColumns.length > 0) {
          issues.push({
            file: relativePath,
            table: tableName,
            missing: missingColumns,
            available: dbSchema[tableName]
          });
        }
      }
    }
    
    // Report issues
    if (issues.length === 0) {
      console.log("✅ No missing column issues found!\n");
    } else {
      console.log(`❌ Found ${issues.length} potential issues:\n`);
      
      issues.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.file}`);
        console.log(`   Table: ${issue.table}`);
        console.log(`   Missing columns: ${issue.missing.join(', ')}`);
        console.log(`   Available columns: ${issue.available.slice(0, 10).join(', ')}${issue.available.length > 10 ? '...' : ''}`);
        console.log();
      });
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkMissingColumns();
