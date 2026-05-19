require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const subjectRoutes = require('./routes/subjects');
const classroomRoutes = require('./routes/classrooms');
const examRoutes = require('./routes/exams');
const seatingRoutes = require('./routes/seating');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve built frontend
const clientPath = path.join(__dirname, '../client_built');
app.use(express.static(clientPath));

// Health check and logging 
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Catch-all: serve frontend for any non-API route
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(clientPath, 'index.html'));
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/seating', seatingRoutes);

// Initialize DB and start server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
});
