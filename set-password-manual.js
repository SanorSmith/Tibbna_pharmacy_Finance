const http = require('http');

const data = JSON.stringify({
  email: "sanorsmith83@gmail.com",
  password: "password123"
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
    console.log('\nYou can now login with:');
    console.log('Email: sanorsmith83@gmail.com');
    console.log('Password: password123');
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
