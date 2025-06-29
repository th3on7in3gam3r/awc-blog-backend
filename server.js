const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
    origin: [
        'https://www.claudeusercontent.com',
        'https://claudeusercontent.com',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
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

// ===== PRAYER WALL ENDPOINTS =====
console.log('🙏 Setting up Prayer Wall endpoints...');

// Prayer storage (in-memory)
let prayers = [
    {
        id: '1',
        name: 'Sarah M.',
        request: 'Please pray for my father\'s healing journey.',
        hearts: 23,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        anonymous: false
    },
    {
        id: '2',
        name: 'Anonymous', 
        request: 'Pray for wisdom in a major career decision.',
        hearts: 18,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        anonymous: true
    }
];

let nextPrayerId = 3;

// GET all prayers
app.get('/api/prayers', (req, res) => {
    console.log('📖 Getting prayer requests...');
    try {
        const sortedPrayers = prayers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json({
            success: true,
            prayers: sortedPrayers,
            total: prayers.length
        });
        console.log(`✅ Sent ${sortedPrayers.length} prayers`);
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch prayers' });
    }
});

// POST new prayer
app.post('/api/prayers', (req, res) => {
    console.log('📝 Creating prayer:', req.body);
    try {
        if (!req.body.request || req.body.request.trim() === '') {
            return res.status(400).json({ success: false, error: 'Prayer request required' });
        }

        const prayer = {
            id: String(nextPrayerId++),
            name: req.body.anonymous ? 'Anonymous' : (req.body.name || 'Anonymous'),
            request: req.body.request.trim(),
            hearts: 0,
            date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            anonymous: Boolean(req.body.anonymous)
        };

        prayers.push(prayer);
        console.log(`✅ Prayer added by ${prayer.name}`);
        
        res.status(201).json({ success: true, prayer: prayer });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: 'Failed to create prayer' });
    }
});

// POST heart prayer
app.post('/api/prayers/:id/heart', (req, res) => {
    console.log('❤️ Hearting prayer:', req.params.id);
    try {
        const prayer = prayers.find(p => p.id === req.params.id);
        if (!prayer) {
            return res.status(404).json({ success: false, error: 'Prayer not found' });
        }
        
        prayer.hearts++;
        console.log(`✅ Prayer hearted! New count: ${prayer.hearts}`);
        
        res.json({ success: true, prayer: prayer });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: 'Failed to heart prayer' });
    }
});

console.log('✅ Prayer Wall endpoints ready!');
// ===== END PRAYER WALL ENDPOINTS =====

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
