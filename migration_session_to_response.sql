-- Migration: Rename azure_session_id to azure_response_id
-- Azure Response API uses response IDs for stateful conversation chaining

USE chatbot;

-- Rename the column in conversations table
ALTER TABLE conversations 
CHANGE COLUMN azure_session_id azure_response_id VARCHAR(255) NULL 
COMMENT 'Azure Response API response ID for context chaining';

-- Update the index
DROP INDEX IF EXISTS idx_azure_session_id ON conversations;
CREATE INDEX idx_azure_response_id ON conversations (azure_response_id);

-- Update azure_sessions table to reference response_id
-- (Optional: You can keep this table for tracking or remove it if not needed)
ALTER TABLE azure_sessions 
ADD COLUMN response_id VARCHAR(255) NULL 
COMMENT 'Azure Response API response ID'
AFTER session_id;

-- Add comment explaining the change
ALTER TABLE conversations 
MODIFY COLUMN azure_response_id VARCHAR(255) NULL 
COMMENT 'Azure Response API response ID (previous_response_id for chaining)';

SELECT 'Migration complete: azure_session_id renamed to azure_response_id' AS status;
