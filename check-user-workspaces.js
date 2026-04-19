// Script to check all users and their workspace access
// Run this in browser console after logging in

fetch('/api/admin/users', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': document.cookie
  }
})
.then(response => response.json())
.then(users => {
  console.log('=== ALL USERS AND THEIR ACCESS ===\n');
  
  users.forEach(user => {
    console.log(`User: ${user.name || 'N/A'}`);
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Permissions: ${JSON.stringify(user.permissions || [])}`);
    console.log('---');
  });
})
.then(() => {
  // Also get workspaces
  return fetch('/api/admin/workspace', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': document.cookie
    }
  });
})
.then(response => response.json())
.then(workspaces => {
  console.log('\n=== ALL WORKSPACES ===\n');
  
  workspaces.forEach(workspace => {
    console.log(`Workspace: ${workspace.name}`);
    console.log(`ID: ${workspace.workspaceid}`);
    console.log(`Type: ${workspace.type}`);
    console.log(`Description: ${workspace.description || 'N/A'}`);
    console.log('---');
  });
})
.catch(error => {
  console.error('Error:', error);
  console.log('You might need admin permissions to view this data');
});
