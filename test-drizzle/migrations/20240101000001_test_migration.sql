-- MIGRATION ORDER GUIDELINES:
-- 1. CREATE statements (tables, indexes) first
-- 2. ALTER statements (modify existing structures)
-- 3. INSERT/UPDATE statements (data operations)
-- 4. DROP statements (remove structures) last
--
-- ⚠️  IMPORTANT: BACKUP RECOMMENDATION
-- This migration contains potentially destructive operations.
-- It is STRONGLY recommended to create a full database backup before proceeding.
-- Command example: pg_dump database_name > backup_$(date +%Y%m%d_%H%M%S).sql
--
-- MIGRATION ORDER GUIDELINES:
-- 1. CREATE statements (tables, indexes) first
-- 2. ALTER statements (modify existing structures)
-- 3. INSERT/UPDATE statements (data operations)
-- 4. DROP statements (remove structures) last
--
-- ⚠️  IMPORTANT: BACKUP RECOMMENDATION
-- This migration contains potentially destructive operations.
-- It is STRONGLY recommended to create a full database backup before proceeding.
-- Command example: pg_dump database_name > backup_$(date +%Y%m%d_%H%M%S).sql
--
-- Flow Enhancement: Transaction Wrapper
-- Wraps migration in transaction for safety and rollback capability
BEGIN;

-- Test migration with various operations to test enhancements
-- This migration intentionally includes operations that should trigger safety and speed enhancements

-- UP migration
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ⚠️  CRITICAL WARNING: DROP TABLE OPERATION
-- Table: OPERATION
-- This operation will PERMANENTLY DELETE ALL DATA in this table
-- Ensure you have a backup before proceeding
-- Consider using 'DROP TABLE IF EXISTS' for safer execution
-- Original command: -- ⚠️  CRITICAL WARNING: DROP TABLE OPERATION
-- ⚠️  CRITICAL WARNING: DROP TABLE IF EXISTS OPERATION
-- Table: old_users
-- This operation will PERMANENTLY DELETE ALL DATA in this table
-- Ensure you have a backup before proceeding
-- ⚠️  CRITICAL WARNING: DROP TABLE OPERATION
-- Table: IF
-- This operation will PERMANENTLY DELETE ALL DATA in this table
-- Ensure you have a backup before proceeding
-- Consider using 'DROP TABLE IF EXISTS' for safer execution
-- Original command: -- Consider using 'DROP TABLE IF EXISTS' for safer execution
-- Consider using 'DROP TABLE IF EXISTS IF EXISTS' for safer execution
-- ⚠️  CRITICAL WARNING: DROP TABLE OPERATION
-- Table: old_users
-- This operation will PERMANENTLY DELETE ALL DATA in this table
-- Ensure you have a backup before proceeding
-- Consider using 'DROP TABLE IF EXISTS' for safer execution
-- Original command: -- Original command: DROP TABLE old_users;
-- Original command: DROP TABLE IF EXISTS old_users;
-- ⚠️  CRITICAL WARNING: DROP TABLE OPERATION
-- Table: old_users
-- This operation will PERMANENTLY DELETE ALL DATA in this table
-- Ensure you have a backup before proceeding
-- Consider using 'DROP TABLE IF EXISTS' for safer execution
-- Original command: DROP TABLE IF EXISTS old_users;
DROP TABLE IF EXISTS IF EXISTS old_users;

ALTER TABLE users ADD COLUMN phone VARCHAR(20);

  -- Safety check: Verify data compatibility before type conversion
  -- Consider backing up data or using a staged migration approach
  -- Safety check: Verify data compatibility before type conversion
  -- Consider backing up data or using a staged migration approach
ALTER COLUMN status TYPE INTEGER;

-- Flow Enhancement: Concurrent Index Creation
-- Index: idx_users_email
-- Using CONCURRENT option to avoid blocking table access during creation
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);

-- Flow Enhancement: Concurrent Index Creation
-- Index: idx_users_status
-- Using CONCURRENT option to avoid blocking table access during creation
CREATE INDEX CONCURRENTLY idx_users_status ON users (status);

-- Flow Enhancement: Concurrent Index Creation
-- Index: idx_users_created
-- Using CONCURRENT option to avoid blocking table access during creation
CREATE INDEX CONCURRENTLY idx_users_created ON users (created_at);

INSERT INTO users (email, name, status) VALUES 
('test1@example.com', 'User 1', 'active');

INSERT INTO users (email, name, status) VALUES 
('test2@example.com', 'User 2', 'inactive');

INSERT INTO users (email, name, status) VALUES 
('test3@example.com', 'User 3', 'active');

INSERT INTO users (email, name, status) VALUES 
('test4@example.com', 'User 4', 'pending');

UPDATE users SET status = 'verified' WHERE status = 'active';

-- UNIQUE CONSTRAINT WARNING:
-- Ensure no duplicate values exist before adding unique constraint:
-- SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name HAVING COUNT(*) > 1;
-- UNIQUE CONSTRAINT WARNING:
-- UNIQUE CONSTRAINT WARNING:
-- Ensure no duplicate values exist before adding unique constraint:
-- SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name HAVING COUNT(*) > 1;
-- Ensure no duplicate values exist before adding unique constraint:
-- SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name HAVING COUNT(*) > 1;
-- UNIQUE CONSTRAINT WARNING:
-- Ensure no duplicate values exist before adding unique constraint:
-- SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name HAVING COUNT(*) > 1;
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- CHECK CONSTRAINT WARNING:
-- Verify existing data meets constraint requirements:
-- SELECT * FROM table_name WHERE NOT (constraint_condition);
-- CHECK CONSTRAINT WARNING:
-- Verify existing data meets constraint requirements:
-- SELECT * FROM table_name WHERE NOT (constraint_condition);
-- CHECK CONSTRAINT WARNING:
-- Verify existing data meets constraint requirements:
-- SELECT * FROM table_name WHERE NOT (constraint_condition);
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive', 'pending', 'verified'));

ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- ⚠️  COLUMN RENAME WARNING:
-- This operation can break existing application code.
-- Recommended staged approach:
-- 1. Add new column with desired name
-- 2. Copy data from old to new column
-- 3. Update application code to use new column
-- 4. Drop old column in a separate migration
-- ⚠️  COLUMN RENAME WARNING:
-- This operation can break existing application code.
-- Recommended staged approach:
-- 1. Add new column with desired name
-- 2. Copy data from old to new column
-- 3. Update application code to use new column
-- 4. Drop old column in a separate migration
RENAME COLUMN users.name TO full_name;

CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
-- ⚠️  CASCADE DELETE WARNING:
-- This will automatically delete related records in child tables.
-- Consider safer alternatives:
-- 1. ON DELETE RESTRICT (prevents deletion if child records exist)
-- 2. ON DELETE SET NULL (sets foreign key to NULL)
-- 3. Application-level cleanup logic
-- ⚠️  CASCADE DELETE WARNING:
-- This will automatically delete related records in child tables.
-- Consider safer alternatives:
-- 1. ON DELETE RESTRICT (prevents deletion if child records exist)
-- 2. ON DELETE SET NULL (sets foreign key to NULL)
-- 3. Application-level cleanup logic
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    avatar_url VARCHAR(500)
);

TRUNCATE TABLE user_sessions;

COMMIT;

-- If any statement fails, the entire transaction will be rolled back automatically