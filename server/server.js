const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { authenticateToken, optionalAuth } = require('./middleware/auth');
const createAuthRoutes = require('./routes/auth');
const { testEmailConnection } = require('./services/emailService');
const WebSearchService = require('./services/webSearchService');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Web Search Service
const webSearchService = new WebSearchService({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  instanceName: process.env.AZURE_OPENAI_INSTANCE_NAME,
  deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chatbot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('✓ MySQL database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('✗ MySQL connection error:', err.message);
  });

// Test email connection
testEmailConnection()
  .then(connected => {
    if (!connected) {
      console.warn('⚠️  Email service not configured - password reset emails will not be sent');
      console.warn('    Configure EMAIL_USER and EMAIL_PASSWORD in .env file to enable email functionality');
    }
  })
  .catch(err => {
    console.warn('⚠️  Email connection test failed:', err.message);
  });

// ========================================
// Authentication Routes
// ========================================
app.use('/api/auth', createAuthRoutes(pool));

// ========================================
// Conversations Endpoints
// ========================================

// Get all conversations (protected)
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const [conversations] = await pool.query(
      'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.id]
    );
    
    // Get messages for each conversation
    for (let conv of conversations) {
      const [messages] = await pool.query(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conv.id]
      );
      
      // Get attachments for each message
      for (let msg of messages) {
        const [attachments] = await pool.query(
          'SELECT * FROM attachments WHERE message_id = ?',
          [msg.id]
        );
        msg.attachments = attachments;
      }
      
      conv.messages = messages;
    }
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get single conversation by ID (protected)
app.get('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [conversations] = await pool.query(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const conversation = conversations[0];
    
    // Get messages
    const [messages] = await pool.query(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id]
    );
    
    // Get attachments for each message
    for (let msg of messages) {
      const [attachments] = await pool.query(
        'SELECT * FROM attachments WHERE message_id = ?',
        [msg.id]
      );
      msg.attachments = attachments;
    }
    
    conversation.messages = messages;
    
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Create new conversation (protected)
app.post('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const { id, title, azureResponseId } = req.body;
    const now = Date.now();
    
    await pool.query(
      'INSERT INTO conversations (id, title, azure_response_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title || 'New chat', azureResponseId || null, req.user.id, now, now]
    );
    
    res.status(201).json({
      id,
      title: title || 'New chat',
      azure_response_id: azureResponseId || null,
      user_id: req.user.id,
      created_at: now,
      updated_at: now,
      messages: []
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update conversation title (protected)
app.patch('/api/conversations/:id/title', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const now = Date.now();
    
    await pool.query(
      'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [title, now, id, req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    res.status(500).json({ error: 'Failed to update conversation title' });
  }
});

// Update conversation Azure response ID (protected)
app.patch('/api/conversations/:id/response', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { azureResponseId } = req.body;
    const now = Date.now();
    
    await pool.query(
      'UPDATE conversations SET azure_response_id = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [azureResponseId, now, id, req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating Azure response ID:', error);
    res.status(500).json({ error: 'Failed to update Azure response ID' });
  }
});

// Delete conversation (protected)
app.delete('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete will cascade to messages and attachments
    await pool.query('DELETE FROM conversations WHERE id = ? AND user_id = ?', [id, req.user.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// ========================================
// Messages Endpoints
// ========================================

// Add message to conversation (protected)
app.post('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content, displayContent, attachments } = req.body;
    const now = Date.now();
    
    // Insert message
    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, role, content, display_content, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, role, content, displayContent || content, now]
    );
    
    const messageId = result.insertId;
    
    // Insert attachments if any
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        await pool.query(
          'INSERT INTO attachments (message_id, type, mime_type, file_name, file_size, file_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            messageId,
            attachment.type,
            attachment.mimeType,
            attachment.fileName,
            attachment.fileSize || null,
            attachment.dataUrl, // Store the base64 data URL
            now
          ]
        );
      }
    }
    
    // Update conversation updated_at
    await pool.query(
      'UPDATE conversations SET updated_at = ? WHERE id = ?',
      [now, id]
    );
    
    res.status(201).json({
      id: messageId,
      conversation_id: id,
      role,
      content,
      display_content: displayContent || content,
      created_at: now
    });
  } catch (error) {
    console.error('Error adding message:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql
    });
    res.status(500).json({ error: 'Failed to add message', details: error.message });
  }
});

// Delete last message from conversation (protected)
app.delete('/api/conversations/:id/messages/last', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const now = Date.now();
    
    // Get the last message ID for this conversation
    const [messages] = await pool.query(
      'SELECT id FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
      [id]
    );
    
    if (messages.length === 0) {
      return res.status(404).json({ error: 'No messages found' });
    }
    
    const messageId = messages[0].id;
    
    // Delete the message (attachments will cascade delete)
    await pool.query('DELETE FROM messages WHERE id = ?', [messageId]);
    
    // Update conversation updated_at
    await pool.query(
      'UPDATE conversations SET updated_at = ? WHERE id = ?',
      [now, id]
    );
    
    res.json({ success: true, deletedMessageId: messageId });
  } catch (error) {
    console.error('Error deleting last message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ========================================
// Azure Session Management
// ========================================

// Create or update Azure session metadata (protected)
app.post('/api/azure-sessions', authenticateToken, async (req, res) => {
  try {
    const { sessionId, conversationId, modelName, totalTokens } = req.body;
    const now = Date.now();
    
    await pool.query(
      `INSERT INTO azure_sessions (session_id, conversation_id, model_name, total_tokens, last_used_at, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       total_tokens = ?, last_used_at = ?`,
      [sessionId, conversationId, modelName, totalTokens || 0, now, now, totalTokens || 0, now]
    );
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error managing Azure session:', error);
    res.status(500).json({ error: 'Failed to manage Azure session' });
  }
});

// Get Azure session by conversation ID (protected)
app.get('/api/conversations/:id/session', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [sessions] = await pool.query(
      'SELECT * FROM azure_sessions WHERE conversation_id = ? ORDER BY last_used_at DESC LIMIT 1',
      [id]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(sessions[0]);
  } catch (error) {
    console.error('Error fetching Azure session:', error);
    res.status(500).json({ error: 'Failed to fetch Azure session' });
  }
});

// ========================================
// Web Search Endpoint
// ========================================

// Process message with web search capability
app.post('/api/chat/search', authenticateToken, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get conversation history if conversationId provided
    let conversationHistory = [];
    if (conversationId) {
      const [messages] = await pool.query(
        `SELECT m.role, m.content 
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.id = ? AND c.user_id = ?
         ORDER BY m.created_at ASC
         LIMIT 10`,
        [conversationId, req.user.id]
      );
      conversationHistory = messages;
    }

    // Process with web search
    const result = await webSearchService.processQuery(message, conversationHistory);

    res.json({
      success: result.success,
      response: result.response,
      usedWebSearch: result.usedWebSearch,
      error: result.error,
    });

  } catch (error) {
    console.error('Error in web search:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process web search',
      response: 'I apologize, but I encountered an error while searching the web.'
    });
  }
});

// Stream chat response with web search
app.post('/api/chat/search/stream', authenticateToken, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get conversation history
    let conversationHistory = [];
    if (conversationId) {
      const [messages] = await pool.query(
        `SELECT m.role, m.content 
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.id = ? AND c.user_id = ?
         ORDER BY m.created_at ASC
         LIMIT 10`,
        [conversationId, req.user.id]
      );
      conversationHistory = messages;
    }

    // Stream tokens
    const result = await webSearchService.processQueryStream(
      message,
      conversationHistory,
      (token) => {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    );

    // Send final result
    res.write(`data: ${JSON.stringify({ 
      done: true, 
      usedWebSearch: result.usedWebSearch 
    })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in streaming web search:', error);
    res.write(`data: ${JSON.stringify({ 
      error: 'Failed to process web search',
      done: true 
    })}\n\n`);
    res.end();
  }
});

// ========================================
// Health Check
// ========================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
