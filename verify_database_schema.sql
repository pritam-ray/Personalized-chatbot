-- ========================================
-- Complete Database Setup for Authentication
-- Run this to ensure all tables are properly configured
-- ========================================

USE chatbot;

-- ========================================
-- 1. Verify all tables exist
-- ========================================
SHOW TABLES;

-- ========================================
-- 2. Check users table structure
-- ========================================
DESCRIBE users;

-- ========================================
-- 3. Check conversations table has user_id
-- ========================================
DESCRIBE conversations;

-- ========================================
-- 4. Check refresh_tokens table
-- ========================================
DESCRIBE refresh_tokens;

-- ========================================
-- 5. Verify foreign key constraints
-- ========================================
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
    TABLE_SCHEMA = 'chatbot'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

-- ========================================
-- 6. Check existing users
-- ========================================
SELECT 
    id, 
    email, 
    username, 
    is_active,
    FROM_UNIXTIME(created_at/1000) as created_date,
    FROM_UNIXTIME(last_login_at/1000) as last_login
FROM users;

-- ========================================
-- 7. Count conversations per user
-- ========================================
SELECT 
    u.username,
    u.email,
    COUNT(c.id) as conversation_count
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id
GROUP BY u.id, u.username, u.email;

SELECT '✓ Database schema verification complete!' as Status;
SELECT 'You can now signup with a new account at http://localhost:5173' as NextStep;
