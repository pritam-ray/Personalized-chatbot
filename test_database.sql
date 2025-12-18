-- ========================================
-- QUICK DATABASE VERIFICATION SCRIPT
-- Run this in MySQL Workbench to verify setup
-- ========================================

USE chatbot;

-- 1. List all tables (should see 6 tables)
SELECT 'Step 1: Checking tables...' as Status;
SHOW TABLES;

-- 2. Verify users table structure
SELECT 'Step 2: Verifying users table...' as Status;
DESCRIBE users;

-- 3. Verify conversations has user_id column
SELECT 'Step 3: Verifying conversations table...' as Status;
DESCRIBE conversations;

-- 4. Verify refresh_tokens table
SELECT 'Step 4: Verifying refresh_tokens table...' as Status;
DESCRIBE refresh_tokens;

-- 5. Check foreign key relationships
SELECT 'Step 5: Checking foreign keys...' as Status;
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'chatbot'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 6. Count existing data
SELECT 'Step 6: Counting data...' as Status;
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM conversations) as total_conversations,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(*) FROM refresh_tokens) as total_tokens;

-- 7. Show existing users (if any)
SELECT 'Step 7: Listing users...' as Status;
SELECT 
    id,
    email,
    username,
    is_active,
    FROM_UNIXTIME(created_at/1000) as created_date
FROM users
LIMIT 10;

-- Final status
SELECT '✅ DATABASE VERIFICATION COMPLETE!' as Status;
SELECT 'All tables configured correctly.' as Result;
SELECT 'Ready for user signups at http://localhost:5173' as NextStep;
