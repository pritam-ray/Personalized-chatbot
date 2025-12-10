USE chatbot;

-- Create guest user for testing (allows app to work without authentication)
INSERT INTO users (id, email, username, password_hash, created_at, updated_at, is_active) 
VALUES ('guest-user-1', 'guest@example.com', 'Guest User', '$2a$10$dummyHashForGuest', UNIX_TIMESTAMP() * 1000, UNIX_TIMESTAMP() * 1000, true)
ON DUPLICATE KEY UPDATE username='Guest User', is_active=true;

SELECT 'Guest user created/updated successfully' AS message;
