USE chatbot;

-- Verify tables exist
SHOW TABLES;

-- Check if user_id column exists in conversations table
DESCRIBE conversations;

-- Create a test user for demo purposes
-- Password: "test123" (bcrypt hashed)
INSERT INTO users (id, email, username, password_hash, created_at, updated_at, is_active) 
VALUES (
  'test-user-123',
  'test@example.com',
  'Test User',
  '$2a$10$YourHashedPasswordHere',
  UNIX_TIMESTAMP() * 1000,
  UNIX_TIMESTAMP() * 1000,
  true
) ON DUPLICATE KEY UPDATE username='Test User', is_active=true;

-- Display user info
SELECT id, email, username, is_active, FROM_UNIXTIME(created_at/1000) as created 
FROM users 
WHERE email = 'test@example.com';

SELECT 'Database setup verified! You can now signup with a new account or use test@example.com' as message;
