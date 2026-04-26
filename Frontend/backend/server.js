const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'lecture_notes_hub_secret_2024';

// In-memory Data Store
const db = {
    users: [],
    notes: [],
    attendance: []
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

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
        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = { id: uuidv4(), username, email, password: hashedPassword };
        db.users.push(user);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.users.find(u => u.email === email);
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Notes Routes
app.get('/api/notes', (req, res) => {
    const { search, date } = req.query;
    let filteredNotes = db.notes.map(note => {
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
app.post('/api/attendance', (req, res) => {
    const { student, course } = req.body;
    const attendance = { id: uuidv4(), student, course, date: new Date() };
    db.attendance.push(attendance);
    res.status(201).json(attendance);
});

app.get('/api/attendance/count', (req, res) => {
    res.json({ count: db.attendance.length });
});

// Dashboard Stats
app.get('/api/stats', (req, res) => {
    const totalNotes = db.notes.length;
    const topRated = db.notes.filter(n => n.rating >= 4).length;
    res.json({ totalNotes, topRated });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (In-Memory DB)`);
});
