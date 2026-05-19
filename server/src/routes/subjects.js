const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
    const { scheme, semester } = req.query;
    let query = "SELECT * FROM subjects WHERE 1=1";
    const params = [];

    if (scheme) {
        query += " AND scheme = ?";
        params.push(scheme);
    }
    if (semester) {
        query += " AND semester = ?";
        params.push(parseInt(semester));
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', (req, res) => {
    const { scheme, semester, subject_code, subject_name } = req.body;
    db.run(
        "INSERT INTO subjects (scheme, semester, subject_code, subject_name) VALUES (?, ?, ?, ?)",
        [scheme, semester, subject_code, subject_name],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Subject created successfully' });
        }
    );
});

router.put('/:id', (req, res) => {
    const { scheme, semester, subject_code, subject_name } = req.body;
    db.run(
        "UPDATE subjects SET scheme = ?, semester = ?, subject_code = ?, subject_name = ? WHERE id = ?",
        [scheme, semester, subject_code, subject_name, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Subject updated successfully', changes: this.changes });
        }
    );
});

router.delete('/:id', (req, res) => {
    db.run("DELETE FROM subjects WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Subject deleted successfully', changes: this.changes });
    });
});

module.exports = router;
