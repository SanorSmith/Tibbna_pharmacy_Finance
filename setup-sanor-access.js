const http = require('http');

// Set password for sanor sha user
const data = JSON.stringify({
  email: "sanorsha@hotmail.com",
  password: "ehruser123"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/set-password',
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
    console.log('\n=== SANOR SHA LOGIN CREDENTIALS ===');
    console.log('Email: sanorsha@hotmail.com');
    console.log('Password: ehruser123');
    console.log('\nUser can now login as EHR user with these credentials.');
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
