-- Update sanorsha user role to pharmacist in the workspace
-- Run this SQL command directly in your PostgreSQL database

UPDATE workspaceusers 
SET role = 'pharmacist' 
WHERE userid = (SELECT userid FROM users WHERE email = 'sanorsha@hotmail.com')
AND workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';

-- Verify the update
SELECT 
  u.email,
  u.name,
  wu.role,
  w.name as workspace_name
FROM users u
JOIN workspaceusers wu ON u.userid = wu.userid
JOIN workspaces w ON wu.workspaceid = w.workspaceid
WHERE u.email = 'sanorsha@hotmail.com'
AND wu.workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';
