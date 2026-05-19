const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
    db.all("SELECT * FROM exams ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', (req, res) => {
    const { exam_type, exam_name, semester, start_date, end_date, start_time, end_time, duration, exams_per_day } = req.body;
    db.run(
        `INSERT INTO exams (exam_type, exam_name, semester, start_date, end_date, start_time, end_time, duration, exams_per_day) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [exam_type, exam_name, semester || 1, start_date, end_date, start_time, end_time, duration, exams_per_day || 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Exam created successfully' });
        }
    );
});

// Schedule CRUD Routes
router.get('/:examId/schedule', (req, res) => {
    db.all(
        `SELECT es.*, s.subject_code, s.subject_name, s.scheme 
         FROM exam_schedule es
         JOIN subjects s ON es.subject_id = s.id
         WHERE es.exam_id = ?
         ORDER BY es.exam_date ASC, es.session ASC`,
        [req.params.examId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

router.post('/:examId/schedule', (req, res) => {
    const { exam_date, session, subject_id } = req.body;
    db.run(
        `INSERT INTO exam_schedule (exam_id, exam_date, session, subject_id) VALUES (?, ?, ?, ?)`,
        [req.params.examId, exam_date, session, subject_id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Schedule entry added successfully' });
        }
    );
});

router.delete('/schedule/:id', (req, res) => {
    db.run("DELETE FROM exam_schedule WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Schedule entry deleted successfully' });
    });
});

module.exports = router;
