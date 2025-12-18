-- ========================================
-- DATABASE UPDATES FOR PROFILE & PASSWORD RESET
-- ========================================

USE chatbot;

-- Add profile fields to users table (only if they don't exist)
ALTER TABLE users 
ADD COLUMN first_name VARCHAR(100) NULL COMMENT 'User first name';

ALTER TABLE users 
ADD COLUMN last_name VARCHAR(100) NULL COMMENT 'User last name';

-- Make username unique (ignore error if index already exists)
ALTER TABLE users 
ADD UNIQUE INDEX idx_username_unique (username);

-- ========================================
-- PASSWORD RESET TOKENS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL COMMENT 'Expiry timestamp in milliseconds',
  used BOOLEAN DEFAULT FALSE COMMENT 'Whether token has been used',
  created_at BIGINT NOT NULL COMMENT 'Creation timestamp in milliseconds',
  
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  
  CONSTRAINT fk_password_reset_user 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- SAMPLE DATA CHECK
-- ========================================
-- To verify the changes:
-- SELECT id, email, username, first_name, last_name, created_at FROM users;
-- SELECT * FROM password_reset_tokens;
