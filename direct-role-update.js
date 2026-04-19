// Direct database update for user role
// Run with: node direct-role-update.js

require('dotenv').config({ path: '.env.local' });
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq, and } = require('drizzle-orm');

// Schema imports (simplified)
const users = {
  userid: 'userid',
  email: 'email',
  name: 'name'
};

const workspaceusers = {
  userid: 'userid',
  workspaceid: 'workspaceid', 
  role: 'role'
};

const workspaces = {
  workspaceid: 'workspaceid',
  name: 'name'
};

async function updateUserRole() {
  let client;
  
  try {
    // Create database connection
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    client = postgres(`${connectionString}?sslmode=require`);
    const db = drizzle(client);

    console.log('=== UPDATING USER ROLE ===');
    console.log('Email: sanorsha@hotmail.com');
    console.log('New Role: pharmacist');
    console.log('Workspace: fa9fb036-a7eb-49af-890c-54406dad139d');
    console.log('');

    // First, get the user ID
    const userResult = await client`
      SELECT userid, name FROM users WHERE email = ${'sanorsha@hotmail.com'}
    `;

    if (userResult.length === 0) {
      console.error('User not found!');
      return;
    }

    const userId = userResult[0].userid;
    const userName = userResult[0].name;
    console.log(`Found user: ${userName} (${userId})`);

    // Check if workspace user entry exists
    const workspaceUserResult = await client`
      SELECT * FROM workspaceusers 
      WHERE userid = ${userId} 
      AND workspaceid = ${'fa9fb036-a7eb-49af-890c-54406dad139d'}
    `;

    if (workspaceUserResult.length === 0) {
      // Create new workspace user entry
      await client`
        INSERT INTO workspaceusers (userid, workspaceid, role, createdat)
        VALUES (${userId}, ${'fa9fb036-a7eb-49af-890c-54406dad139d'}, ${'pharmacist'}, NOW())
      `;
      console.log('Created new workspace user entry with pharmacist role');
    } else {
      // Update existing role
      await client`
        UPDATE workspaceusers 
        SET role = ${'pharmacist'}, updatedat = NOW()
        WHERE userid = ${userId} 
        AND workspaceid = ${'fa9fb036-a7eb-49af-890c-54406dad139d'}
      `;
      console.log('Updated existing workspace user role to pharmacist');
    }

    // Verify the update
    const verifyResult = await client`
      SELECT 
        u.email,
        u.name,
        wu.role,
        w.name as workspace_name
      FROM users u
      JOIN workspaceusers wu ON u.userid = wu.userid
      JOIN workspaces w ON wu.workspaceid = w.workspaceid
      WHERE u.email = ${'sanorsha@hotmail.com'}
      AND wu.workspaceid = ${'fa9fb036-a7eb-49af-890c-54406dad139d'}
    `;

    console.log('');
    console.log('=== VERIFICATION ===');
    console.log(`User: ${verifyResult[0].name} (${verifyResult[0].email})`);
    console.log(`Role: ${verifyResult[0].role}`);
    console.log(`Workspace: ${verifyResult[0].workspace_name}`);
    console.log('');
    console.log('SUCCESS! User can now access pharmacy features as a pharmacist!');

  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

updateUserRole();
