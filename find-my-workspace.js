// After logging in, open browser console and run this script:
// This will show your available workspaces and their IDs

fetch('/api/admin/workspace', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': document.cookie
  }
})
.then(response => response.json())
.then(data => {
  console.log('Your Workspaces:', data);
  if (data.length > 0) {
    data.forEach(workspace => {
      console.log(`Workspace: ${workspace.name}`);
      console.log(`ID: ${workspace.workspaceid}`);
      console.log(`Type: ${workspace.type}`);
      console.log(`Dashboard URL: http://localhost:3000/d/${workspace.workspaceid}/pharmacy/dashboard`);
      console.log('---');
    });
  }
})
.catch(error => console.error('Error:', error));
