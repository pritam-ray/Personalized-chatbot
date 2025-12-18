-- ========================================
-- COMPLETE DATABASE SETUP FOR CHATBOT
-- Azure OpenAI Chatbot with Authentication
-- ========================================

-- Create database
CREATE DATABASE IF NOT EXISTS chatbot
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE chatbot;

-- ========================================
-- 1. USERS TABLE (Authentication)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed password',
  created_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  updated_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  last_login_at BIGINT NULL COMMENT 'Last login timestamp',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Account active status',
  
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 2. CONVERSATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NULL COMMENT 'Owner of the conversation',
  title VARCHAR(500) NOT NULL DEFAULT 'New chat',
  azure_response_id VARCHAR(255) NULL COMMENT 'Azure Response API response ID (previous_response_id for context chaining)',
  created_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  updated_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  
  INDEX idx_user_id (user_id),
  INDEX idx_updated_at (updated_at),
  INDEX idx_azure_response_id (azure_response_id),
  
  CONSTRAINT fk_conversations_user 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 3. MESSAGES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL COMMENT 'Full message content',
  display_content TEXT NULL COMMENT 'Formatted content for display (may differ from API content)',
  created_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_created_at (created_at),
  
  CONSTRAINT fk_messages_conversation 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 4. ATTACHMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  type ENUM('image', 'pdf', 'audio', 'file') NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_size INT NULL COMMENT 'File size in bytes',
  file_data LONGBLOB NOT NULL COMMENT 'Base64 encoded file data',
  created_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  
  INDEX idx_message_id (message_id),
  
  CONSTRAINT fk_attachments_message 
    FOREIGN KEY (message_id) REFERENCES messages(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. REFRESH TOKENS TABLE (JWT Session Management)
-- ========================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL COMMENT 'Token expiration timestamp',
  created_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  revoked BOOLEAN DEFAULT FALSE COMMENT 'Token revoked status',
  
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  
  CONSTRAINT fk_refresh_tokens_user 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 6. AZURE SESSIONS TABLE (Optional - for tracking)
-- ========================================
CREATE TABLE IF NOT EXISTS azure_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  model_name VARCHAR(100) NULL,
  total_tokens INT DEFAULT 0 COMMENT 'Track token usage',
  last_used_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  expires_at BIGINT NULL COMMENT 'When Azure session expires (if applicable)',
  created_at BIGINT NOT NULL COMMENT 'Timestamp in milliseconds',
  
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_last_used_at (last_used_at),
  
  CONSTRAINT fk_azure_sessions_conversation 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Show all tables
SELECT '✓ All tables created successfully!' as Status;
SHOW TABLES;

-- Show table structures
SELECT '--- Users Table Structure ---' as Info;
DESCRIBE users;

SELECT '--- Conversations Table Structure ---' as Info;
DESCRIBE conversations;

SELECT '--- Messages Table Structure ---' as Info;
DESCRIBE messages;

SELECT '--- Attachments Table Structure ---' as Info;
DESCRIBE attachments;

SELECT '--- Refresh Tokens Table Structure ---' as Info;
DESCRIBE refresh_tokens;

SELECT '--- Azure Sessions Table Structure ---' as Info;
DESCRIBE azure_sessions;

-- Show foreign key relationships
SELECT '--- Foreign Key Relationships ---' as Info;
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'chatbot'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Final message
SELECT '========================================' as '';
SELECT '✅ DATABASE SETUP COMPLETE!' as Status;
SELECT '========================================' as '';
SELECT 'Database: chatbot' as Info;
SELECT 'Tables created: 6' as Info;
SELECT 'Ready for: User signups and chat conversations' as Info;
SELECT 'Next step: Visit http://localhost:5173 to signup' as Info;
SELECT '========================================' as '';
