-- Verification script for audit_logs migration
-- This script tests that the migration creates the correct table structure

-- Check if control_plane schema exists
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'control_plane';

-- Check if audit_logs table exists
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema = 'control_plane'
  AND table_name = 'audit_logs';

-- Get table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'control_plane'
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Get indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'control_plane'
  AND tablename = 'audit_logs'
ORDER BY indexname;

-- Get table constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'control_plane'
  AND table_name = 'audit_logs';

-- Get check constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'control_plane.audit_logs'::regclass;

-- Sample query: Insert a test audit log
INSERT INTO control_plane.audit_logs (
  actor_id,
  actor_type,
  action,
  target_type,
  target_id,
  metadata,
  ip_address,
  user_agent
) VALUES (
  'user_test123',
  'user',
  'project.created',
  'project',
  'proj_test456',
  '{"changes": {"name": "TestProject"}, "environment": "development"}'::jsonb,
  '192.168.1.1'::inet,
  'Mozilla/5.0 Test'
);

-- Query the inserted record
SELECT *
FROM control_plane.audit_logs
WHERE actor_id = 'user_test123';

-- Clean up test data
DELETE FROM control_plane.audit_logs
WHERE actor_id = 'user_test123';
