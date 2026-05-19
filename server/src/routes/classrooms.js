const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
    const { type } = req.query;
    let query = "SELECT * FROM classrooms";
    const params = [];
    if (type) {
        query += " WHERE room_type = ?";
        params.push(type);
    }
    query += " ORDER BY id ASC";
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', (req, res) => {
    const { room_name, room_type, vtu_capacity, internal_capacity } = req.body;
    db.run(
        "INSERT INTO classrooms (room_name, room_type, vtu_capacity, internal_capacity) VALUES (?, ?, ?, ?)",
        [room_name, room_type || 'classroom', vtu_capacity || 30, internal_capacity || 40],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Classroom added successfully' });
        }
    );
});

router.put('/:id', (req, res) => {
    const { vtu_capacity, internal_capacity } = req.body;
    db.run(
        "UPDATE classrooms SET vtu_capacity = ?, internal_capacity = ? WHERE id = ?",
        [vtu_capacity, internal_capacity, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Updated successfully', changes: this.changes });
        }
    );
});

router.delete('/:id', (req, res) => {
    db.run("DELETE FROM classrooms WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted successfully', changes: this.changes });
    });
});

module.exports = router;
