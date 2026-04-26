const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'lecture_notes_hub_secret_2024';
const MONGO_URI = process.env.MONGO_URI;

// In-memory Data Store (Fallback)
let db = {
    users: [],
    notes: [],
    attendance: []
};

// MongoDB Connection
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('Connected to MongoDB'))
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.log('Using In-Memory Database (Data will not persist)');
}

// Models
const User = require('./models/user');
const Attendance = require('./models/attendence');

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the 'Frontend' directory
const staticPath = path.join(process.cwd(), 'Frontend');
app.use(express.static(staticPath));


// Auth Middleware
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
        const verified = jwt.verify(token.split(' ')[1], JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// Routes

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (MONGO_URI) {
            const existingUser = await User.findOne({ email });
            if (existingUser) return res.status(400).json({ error: 'Email already exists' });
            
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({ username, email, password: hashedPassword });
            await user.save();
        } else {
            if (db.users.find(u => u.email === email)) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = { id: uuidv4(), username, email, password: hashedPassword };
            db.users.push(user);
        }
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user;
        
        if (MONGO_URI) {
            user = await User.findOne({ email });
        } else {
            user = db.users.find(u => u.email === email);
        }
        
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const userId = MONGO_URI ? user._id : user.id;
        const token = jwt.sign({ id: userId, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Notes Routes (Using in-memory for notes as well if no MONGO_URI, but let's keep it simple)
app.get('/api/notes', async (req, res) => {
    const { search, date } = req.query;
    let notes = db.notes;
    
    // Note: To keep this demo simple and "jldi", I'm keeping notes in memory for now 
    // but the user can easily extend this to MongoDB if they want.
    
    let filteredNotes = notes.map(note => {
        const user = db.users.find(u => u.id === note.authorId);
        return { ...note, author: user ? { username: user.username } : null };
    });

    if (search) {
        filteredNotes = filteredNotes.filter(n => n.course.toLowerCase().includes(search.toLowerCase()));
    }
    if (date) {
        filteredNotes = filteredNotes.filter(n => n.date === date);
    }

    res.json(filteredNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/notes', authenticate, (req, res) => {
    const { title, course, date, summary } = req.body;
    const note = {
        _id: uuidv4(),
        title,
        course,
        date,
        summary,
        authorId: req.user.id,
        rating: 0,
        createdAt: new Date()
    };
    db.notes.push(note);
    res.status(201).json(note);
});

app.delete('/api/notes/:id', authenticate, (req, res) => {
    const index = db.notes.findIndex(n => n._id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Note not found' });
    if (db.notes[index].authorId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    db.notes.splice(index, 1);
    res.json({ message: 'Note deleted' });
});

// Attendance Routes
app.post('/api/attendance', async (req, res) => {
    const { student, course } = req.body;
    
    if (MONGO_URI) {
        const attendance = new Attendance({ student, course });
        await attendance.save();
        res.status(201).json(attendance);
    } else {
        const attendance = { id: uuidv4(), student, course, date: new Date() };
        db.attendance.push(attendance);
        res.status(201).json(attendance);
    }
});

app.get('/api/attendance/count', async (req, res) => {
    if (MONGO_URI) {
        const count = await Attendance.countDocuments();
        res.json({ count });
    } else {
        res.json({ count: db.attendance.length });
    }
});

// Dashboard Stats
app.get('/api/stats', (req, res) => {
    const totalNotes = db.notes.length;
    const topRated = db.notes.filter(n => n.rating >= 4).length;
    res.json({ totalNotes, topRated });
});

// Serve index.html for all other routes to support SPA feel
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});


// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;


