const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Simple in-memory comments storage (for now)
let comments = {};

// Get comments for a post
app.get('/api/comments/:postId', (req, res) => {
  const { postId } = req.params;
  res.json(comments[postId] || []);
});

// Add a comment
app.post('/api/comments/:postId', (req, res) => {
  const { postId } = req.params;
  const { author_name, author_email, content } = req.body;
  
  if (!comments[postId]) comments[postId] = [];
  
  const newComment = {
    id: Date.now(),
    author_name,
    content,
    created_at: 'Just now'
  };
  
  comments[postId].unshift(newComment);
  res.json(newComment);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AWC Blog API is running!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
