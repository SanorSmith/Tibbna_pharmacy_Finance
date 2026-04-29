const http = require('http');

// First, let's check what workspaces are available
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/workspace',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Available Workspaces:');
    console.log(responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
