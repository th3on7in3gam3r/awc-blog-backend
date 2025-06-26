// server.js - Main server file for AWC Blog Backend
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve static files from public directory

// Rate limiting for comments
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 comments per windowMs
  message: { error: 'Too many comments created from this IP, please try again later.' }
});

// Initialize SQLite Database
const db = new Database('./blog.db');
console.log('Connected to SQLite database.');
initializeDatabase();
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Create tables if they don't exist
function initializeDatabase() {
  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'approved'
  )`);

  // Blog posts table (optional - for future expansion)
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category TEXT,
    category_label TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT true
  )`);

  console.log('Database tables initialized.');
}

// API Routes

// Get all comments for a specific post
app.get('/api/comments/:postId', (req, res) => {
  const { postId } = req.params;
  
  db.all(
    `SELECT id, post_id, author_name, content, created_at 
     FROM comments 
     WHERE post_id = ? AND status = 'approved' 
     ORDER BY created_at DESC`,
    [postId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'Failed to fetch comments' });
      } else {
        // Format the created_at timestamp for display
        const formattedComments = rows.map(comment => ({
          ...comment,
          created_at: formatTimeAgo(new Date(comment.created_at))
        }));
        res.json(formattedComments);
      }
    }
  );
});

// Add a new comment
app.post('/api/comments/:postId', commentLimiter, (req, res) => {
  const { postId } = req.params;
  const { author_name, author_email, content } = req.body;

  // Basic validation
  if (!author_name || !author_email || !content) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (content.length > 1000) {
    return res.status(400).json({ error: 'Comment too long (max 1000 characters)' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(author_email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Insert comment into database
  db.run(
    `INSERT INTO comments (post_id, author_name, author_email, content) 
     VALUES (?, ?, ?, ?)`,
    [postId, author_name, author_email, content],
    function(err) {
      if (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ error: 'Failed to add comment' });
      } else {
        // Return the new comment
        db.get(
          `SELECT id, post_id, author_name, content, created_at 
           FROM comments WHERE id = ?`,
          [this.lastID],
          (err, row) => {
            if (err) {
              res.status(500).json({ error: 'Comment added but failed to retrieve' });
            } else {
              res.status(201).json({
                ...row,
                created_at: formatTimeAgo(new Date(row.created_at))
              });
            }
          }
        );
      }
    }
  );
});

// Get comment count for a post
app.get('/api/comments/:postId/count', (req, res) => {
  const { postId } = req.params;
  
  db.get(
    `SELECT COUNT(*) as count FROM comments WHERE post_id = ? AND status = 'approved'`,
    [postId],
    (err, row) => {
      if (err) {
        console.error('Error counting comments:', err);
        res.status(500).json({ error: 'Failed to count comments' });
      } else {
        res.json({ count: row.count });
      }
    }
  );
});

// Admin route to get all comments (including pending)
app.get('/api/admin/comments', (req, res) => {
  // In a real app, you'd want authentication here
  db.all(
    `SELECT * FROM comments ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) {
        console.error('Error fetching all comments:', err);
        res.status(500).json({ error: 'Failed to fetch comments' });
      } else {
        res.json(rows);
      }
    }
  );
});

// Update comment status (approve/reject)
app.patch('/api/admin/comments/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  db.run(
    `UPDATE comments SET status = ? WHERE id = ?`,
    [status, id],
    function(err) {
      if (err) {
        console.error('Error updating comment status:', err);
        res.status(500).json({ error: 'Failed to update comment' });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Comment not found' });
      } else {
        res.json({ message: 'Comment status updated successfully' });
      }
    }
  );
});

// Delete comment
app.delete('/api/admin/comments/:id', (req, res) => {
  const { id } = req.params;
  
  db.run(
    `DELETE FROM comments WHERE id = ?`,
    [id],
    function(err) {
      if (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ error: 'Failed to delete comment' });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Comment not found' });
      } else {
        res.json({ message: 'Comment deleted successfully' });
      }
    }
  );
});

// Utility function to format timestamps
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AWC Blog API is running',
    timestamp: new Date().toISOString()
  });
});

// Custom routes for blog posts (without .html extension)
app.get('/ministry-teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ministry-teams-post.html'));
});

app.get('/prayer-leadership', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prayer-leadership-post.html'));
});

app.get('/called-to-lead', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'called-to-lead-post.html'));
});

// Serve the main blog HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'awc-blog.html'));
});

// Serve blog posts with .html extension (fallback)
app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  res.sendFile(path.join(__dirname, 'public', `${postId}.html`));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).send(`
    <html>
      <head><title>404 - Page Not Found</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">← Back to Blog Home</a>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AWC Blog server is running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🏠 Blog available at http://localhost:${PORT}`);
  console.log(`📝 Blog posts available at:`);
  console.log(`   • http://localhost:${PORT}/ministry-teams`);
  console.log(`   • http://localhost:${PORT}/prayer-leadership`);
  console.log(`   • http://localhost:${PORT}/called-to-lead`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
