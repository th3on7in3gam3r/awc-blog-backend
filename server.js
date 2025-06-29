const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        // List of allowed domains
        const allowedDomains = [
            'claudeusercontent.com',
            'biblefunland.com', 
            'anointedworshipcenter.com',
            'localhost'
        ];
        
        // Check if the origin domain is allowed
        const isAllowed = allowedDomains.some(domain => 
            origin.includes(domain)
        );
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
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

// ADD THESE ENDPOINTS TO YOUR EXISTING server.js FILE
// (Add after your existing prayer endpoints but before app.listen())

// ===== COMMENTS SYSTEM =====
console.log('💬 Setting up Comments endpoints...');

// Comments storage (in-memory - organized by prayer ID)
let prayerComments = {};
let nextCommentId = 1;

// GET comments for a specific prayer
app.get('/api/prayers/:id/comments', (req, res) => {
    console.log('💬 Getting comments for prayer:', req.params.id);
    try {
        const prayerId = req.params.id;
        const comments = prayerComments[prayerId] || [];
        
        // Sort by most recent first
        const sortedComments = comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.json({
            success: true,
            comments: sortedComments,
            total: comments.length
        });
        
        console.log(`✅ Sent ${comments.length} comments for prayer ${prayerId}`);
    } catch (error) {
        console.error('❌ Error fetching comments:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch comments' });
    }
});

// POST new comment for a specific prayer
app.post('/api/prayers/:id/comments', (req, res) => {
    console.log('💬 Adding comment to prayer:', req.params.id, req.body);
    try {
        const prayerId = req.params.id;
        
        // Validate input
        if (!req.body.content || req.body.content.trim() === '') {
            return res.status(400).json({ success: false, error: 'Comment content required' });
        }
        
        // Check if prayer exists
        const prayer = prayers.find(p => p.id === prayerId);
        if (!prayer) {
            return res.status(404).json({ success: false, error: 'Prayer not found' });
        }
        
        // Create new comment
        const comment = {
            id: String(nextCommentId++),
            author_name: req.body.anonymous ? 'Anonymous' : (req.body.author_name || 'Anonymous'),
            content: req.body.content.trim(),
            created_at: new Date().toISOString(),
            anonymous: Boolean(req.body.anonymous),
            prayer_id: prayerId
        };
        
        // Initialize comments array for this prayer if it doesn't exist
        if (!prayerComments[prayerId]) {
            prayerComments[prayerId] = [];
        }
        
        prayerComments[prayerId].push(comment);
        
        console.log(`✅ Comment added by ${comment.author_name} to prayer ${prayerId}`);
        
        res.status(201).json({ success: true, comment: comment });
    } catch (error) {
        console.error('❌ Error creating comment:', error);
        res.status(500).json({ success: false, error: 'Failed to create comment' });
    }
});

// DELETE a specific comment (admin only)
app.delete('/api/comments/:id', (req, res) => {
    console.log('🗑️ Deleting comment:', req.params.id);
    try {
        const commentId = req.params.id;
        let found = false;
        let prayerId = null;
        
        // Find and remove the comment from the appropriate prayer
        Object.keys(prayerComments).forEach(pid => {
            const commentIndex = prayerComments[pid].findIndex(c => c.id === commentId);
            if (commentIndex !== -1) {
                prayerComments[pid].splice(commentIndex, 1);
                found = true;
                prayerId = pid;
            }
        });
        
        if (!found) {
            return res.status(404).json({ success: false, error: 'Comment not found' });
        }
        
        console.log(`✅ Comment ${commentId} deleted from prayer ${prayerId}`);
        
        res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting comment:', error);
        res.status(500).json({ success: false, error: 'Failed to delete comment' });
    }
});

// DELETE a specific prayer (admin only)
app.delete('/api/prayers/:id', (req, res) => {
    console.log('🗑️ Deleting prayer:', req.params.id);
    try {
        const prayerId = req.params.id;
        const prayerIndex = prayers.findIndex(p => p.id === prayerId);
        
        if (prayerIndex === -1) {
            return res.status(404).json({ success: false, error: 'Prayer not found' });
        }
        
        // Remove the prayer
        prayers.splice(prayerIndex, 1);
        
        // Remove all comments for this prayer
        delete prayerComments[prayerId];
        
        console.log(`✅ Prayer ${prayerId} and its comments deleted`);
        
        res.json({ success: true, message: 'Prayer deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting prayer:', error);
        res.status(500).json({ success: false, error: 'Failed to delete prayer' });
    }
});

// GET all comments across all prayers (admin endpoint)
app.get('/api/admin/comments', (req, res) => {
    console.log('👨‍💼 Admin: Getting all comments');
    try {
        const allComments = [];
        
        Object.keys(prayerComments).forEach(prayerId => {
            prayerComments[prayerId].forEach(comment => {
                allComments.push({
                    ...comment,
                    prayer_id: prayerId
                });
            });
        });
        
        // Sort by most recent first
        const sortedComments = allComments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.json({
            success: true,
            comments: sortedComments,
            total: allComments.length
        });
        
        console.log(`✅ Sent ${allComments.length} total comments to admin`);
    } catch (error) {
        console.error('❌ Error fetching admin comments:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch comments' });
    }
});

// GET statistics (prayers, comments, hearts)
app.get('/api/stats', (req, res) => {
    console.log('📊 Getting statistics');
    try {
        const totalPrayers = prayers.length;
        const totalHearts = prayers.reduce((sum, prayer) => sum + (prayer.hearts || 0), 0);
        const totalComments = Object.values(prayerComments).reduce((sum, comments) => sum + comments.length, 0);
        
        res.json({
            success: true,
            stats: {
                totalPrayers,
                totalHearts,
                totalComments
            }
        });
        
        console.log(`✅ Stats: ${totalPrayers} prayers, ${totalHearts} hearts, ${totalComments} comments`);
    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

console.log('✅ Comments and Admin endpoints ready!');
// ===== END COMMENTS & ADMIN ENDPOINTS =====

// ADD THESE TESTIMONIAL ENDPOINTS TO YOUR EXISTING server.js FILE
// (Add after your existing comments endpoints but before app.listen())

// ===== TESTIMONIAL SYSTEM =====
console.log('🙌 Setting up Testimonial endpoints...');

// Testimonials storage (in-memory)
let testimonials = [
    {
        id: '1',
        name: 'Sarah M.',
        testimony: 'God answered my prayer for my father\'s healing! After months of treatment, the doctors said his cancer is in complete remission. Truly a miracle!',
        anonymous: false,
        approved: true,
        created_at: new Date().toISOString(),
        approved_at: new Date().toISOString()
    },
    {
        id: '2',
        name: 'Anonymous',
        testimony: 'I was struggling with addiction for years. Through prayer and this church family, God gave me strength to overcome. 6 months clean and grateful!',
        anonymous: true,
        approved: true,
        created_at: new Date(Date.now() - 24*60*60*1000).toISOString(), // 1 day ago
        approved_at: new Date(Date.now() - 12*60*60*1000).toISOString()
    }
];

let nextTestimonialId = 3;

// Helper function to check if submission window is open
function isTestimonialSubmissionOpen() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getHours();
    
    // Submission window: Tuesday 12:00 PM to Friday 11:59 PM
    return (dayOfWeek >= 2 && dayOfWeek <= 5) || 
           (dayOfWeek === 2 && hour >= 12) || 
           (dayOfWeek === 5 && hour <= 23);
}

// GET all testimonials (public sees only approved, admin sees all)
app.get('/api/testimonials', (req, res) => {
    console.log('🙌 Getting testimonials...');
    try {
        // For now, return all testimonials (frontend will filter approved ones for public)
        // In production, you might want to add authentication to determine admin vs public
        const sortedTestimonials = testimonials.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.json({
            success: true,
            testimonials: sortedTestimonials,
            total: testimonials.length,
            submissionWindowOpen: isTestimonialSubmissionOpen()
        });
        
        console.log(`✅ Sent ${sortedTestimonials.length} testimonials`);
    } catch (error) {
        console.error('❌ Error fetching testimonials:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch testimonials' });
    }
});

// POST new testimonial (only during submission window)
app.post('/api/testimonials', (req, res) => {
    console.log('🙌 Creating testimonial:', req.body);
    try {
        // Check if submission window is open
        if (!isTestimonialSubmissionOpen()) {
            return res.status(403).json({ 
                success: false, 
                error: 'Testimonial submission is currently closed. Submission window: Tuesday 12:00 PM - Friday 11:59 PM' 
            });
        }
        
        // Validate input
        if (!req.body.testimony || req.body.testimony.trim() === '') {
            return res.status(400).json({ success: false, error: 'Testimony content required' });
        }
        
        if (req.body.testimony.length > 2000) {
            return res.status(400).json({ success: false, error: 'Testimony must be less than 2000 characters' });
        }
        
        if (!req.body.anonymous && (!req.body.name || req.body.name.trim() === '')) {
            return res.status(400).json({ success: false, error: 'Name required when not submitting anonymously' });
        }
        
        // Create new testimonial (pending approval)
        const testimonial = {
            id: String(nextTestimonialId++),
            name: req.body.anonymous ? 'Anonymous' : req.body.name.trim(),
            testimony: req.body.testimony.trim(),
            anonymous: Boolean(req.body.anonymous),
            approved: false, // Requires pastoral approval
            created_at: new Date().toISOString(),
            approved_at: null
        };
        
        testimonials.push(testimonial);
        
        console.log(`✅ Testimonial submitted by ${testimonial.name} for review`);
        
        res.status(201).json({ 
            success: true, 
            testimonial: testimonial,
            message: 'Testimony submitted for pastoral review' 
        });
    } catch (error) {
        console.error('❌ Error creating testimonial:', error);
        res.status(500).json({ success: false, error: 'Failed to create testimonial' });
    }
});

// POST approve testimonial (admin only)
app.post('/api/testimonials/:id/approve', (req, res) => {
    console.log('✅ Approving testimonial:', req.params.id);
    try {
        const testimonialId = req.params.id;
        const testimonial = testimonials.find(t => t.id === testimonialId);
        
        if (!testimonial) {
            return res.status(404).json({ success: false, error: 'Testimonial not found' });
        }
        
        if (testimonial.approved) {
            return res.status(400).json({ success: false, error: 'Testimonial already approved' });
        }
        
        // Approve testimonial
        testimonial.approved = true;
        testimonial.approved_at = new Date().toISOString();
        
        console.log(`✅ Testimonial ${testimonialId} approved for Sunday service`);
        
        res.json({ 
            success: true, 
            testimonial: testimonial,
            message: 'Testimonial approved for Sunday service' 
        });
    } catch (error) {
        console.error('❌ Error approving testimonial:', error);
        res.status(500).json({ success: false, error: 'Failed to approve testimonial' });
    }
});

// DELETE testimonial (admin only)
app.delete('/api/testimonials/:id', (req, res) => {
    console.log('🗑️ Deleting testimonial:', req.params.id);
    try {
        const testimonialId = req.params.id;
        const testimonialIndex = testimonials.findIndex(t => t.id === testimonialId);
        
        if (testimonialIndex === -1) {
            return res.status(404).json({ success: false, error: 'Testimonial not found' });
        }
        
        // Remove the testimonial
        testimonials.splice(testimonialIndex, 1);
        
        console.log(`✅ Testimonial ${testimonialId} deleted`);
        
        res.json({ success: true, message: 'Testimonial deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting testimonial:', error);
        res.status(500).json({ success: false, error: 'Failed to delete testimonial' });
    }
});

// GET testimonial submission status
app.get('/api/testimonials/status', (req, res) => {
    console.log('📅 Checking testimonial submission status');
    try {
        const isOpen = isTestimonialSubmissionOpen();
        const now = new Date();
        
        // Calculate next submission window
        let nextSubmission = new Date();
        const dayOfWeek = now.getDay();
        const hour = now.getHours();
        
        if (dayOfWeek === 0 || dayOfWeek === 1 || (dayOfWeek === 2 && hour < 12)) {
            // Next Tuesday 12 PM
            nextSubmission.setDate(now.getDate() + ((2 + 7 - dayOfWeek) % 7));
            nextSubmission.setHours(12, 0, 0, 0);
        } else if (!isOpen) {
            // Next Tuesday 12 PM (next week)
            nextSubmission.setDate(now.getDate() + (7 - dayOfWeek + 2));
            nextSubmission.setHours(12, 0, 0, 0);
        }
        
        res.json({
            success: true,
            submissionOpen: isOpen,
            nextSubmissionWindow: nextSubmission.toISOString(),
            currentTime: now.toISOString()
        });
        
        console.log(`✅ Submission window ${isOpen ? 'OPEN' : 'CLOSED'}`);
    } catch (error) {
        console.error('❌ Error checking testimonial status:', error);
        res.status(500).json({ success: false, error: 'Failed to check status' });
    }
});

// GET pending testimonials count (admin dashboard helper)
app.get('/api/admin/testimonials/pending', (req, res) => {
    console.log('👨‍💼 Admin: Getting pending testimonials count');
    try {
        const pendingCount = testimonials.filter(t => !t.approved).length;
        const approvedCount = testimonials.filter(t => t.approved).length;
        
        res.json({
            success: true,
            pending: pendingCount,
            approved: approvedCount,
            total: testimonials.length
        });
        
        console.log(`✅ Pending: ${pendingCount}, Approved: ${approvedCount}`);
    } catch (error) {
        console.error('❌ Error fetching testimonial counts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch counts' });
    }
});

console.log('✅ Testimonial endpoints ready!');
// ===== END TESTIMONIAL SYSTEM =====

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
