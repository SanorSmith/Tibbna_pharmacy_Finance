// Simple check of your current access
// Run this in browser console after logging in

console.log('=== CURRENT SESSION INFO ===');
console.log('Current URL:', window.location.href);

// Extract workspace ID from URL if present
const urlMatch = window.location.href.match(/\/d\/([^\/]+)/);
if (urlMatch) {
  const workspaceId = urlMatch[1];
  console.log(`Found workspace ID: ${workspaceId}`);
  console.log(`Pharmacy Dashboard: http://localhost:3000/d/${workspaceId}/pharmacy/dashboard`);
  console.log(`Pharmacy Main: http://localhost:3000/d/${workspaceId}/pharmacy`);
} else {
  console.log('No workspace ID found in URL - look for navigation menus');
}

// Check if there are any navigation elements
const navLinks = document.querySelectorAll('a[href*="/d/"]');
console.log('\n=== NAVIGATION LINKS FOUND ===');
navLinks.forEach((link, index) => {
  console.log(`${index + 1}. ${link.textContent || link.href}: ${link.href}`);
});
