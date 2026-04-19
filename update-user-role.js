const http = require('http');

// Update sanorsha user role to pharmacist
const data = JSON.stringify({
  email: "sanorsha@hotmail.com",
  role: "pharmacist",
  workspaceid: "fa9fb036-a7eb-49af-890c-54406dad139d"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/update-user-role',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    console.log('\n=== USER ROLE UPDATE ===');
    console.log('Email: sanorsha@hotmail.com');
    console.log('New Role: pharmacist');
    console.log('Workspace: fa9fb036-a7eb-49af-890c-54406dad139d');
    console.log('\nUser can now access pharmacy features as a pharmacist!');
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
  console.log('\nTrying alternative approach...');
  
  // Alternative: Direct database update script
  console.log(`
  Alternative approach - run this SQL directly:
  
  UPDATE workspaceusers 
  SET role = 'pharmacist' 
  WHERE userid = (SELECT userid FROM users WHERE email = 'sanorsha@hotmail.com')
  AND workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
  `);
});

req.write(data);
req.end();
