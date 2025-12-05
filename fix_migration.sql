-- Fix incomplete migration
USE chatbot;

-- Drop old index if it exists (ignore error if not found)
SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0;
DROP INDEX idx_azure_session_id ON conversations;
SET SQL_NOTES=@OLD_SQL_NOTES;

-- Create new index
CREATE INDEX idx_azure_response_id ON conversations (azure_response_id);

-- Update azure_sessions table to add response_id column
ALTER TABLE azure_sessions 
ADD COLUMN response_id VARCHAR(255) NULL 
COMMENT 'Azure Response API response ID'
AFTER session_id;

SELECT 'Migration fix complete!' AS status;
