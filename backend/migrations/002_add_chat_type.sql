-- Add chat_type column to chat_conversations
-- Run this in your Supabase SQL Editor

-- Add chat_type column with default 'general'
-- Values: 'general', 'comparison', 'tool'
ALTER TABLE chat_conversations
ADD COLUMN IF NOT EXISTS chat_type TEXT NOT NULL DEFAULT 'general'
CHECK (chat_type IN ('general', 'comparison', 'tool'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_chat_type ON chat_conversations(chat_type);

-- Update existing conversations:
-- - Conversations with tool_id set should be 'tool' type
-- - Conversations without tool_id remain 'general'
UPDATE chat_conversations
SET chat_type = 'tool'
WHERE tool_id IS NOT NULL AND chat_type = 'general';
