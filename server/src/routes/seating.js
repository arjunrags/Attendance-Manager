const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.post('/generate', async (req, res) => {
    const { examId, examType, studentList, floorsConfig, options } = req.body;
    
    const genOptions = options || {
        allowedRoomTypes: ['classroom'],
        capacityOverrides: { classroom: 40, lab: 20 },
        singleSeating: false
    };

    console.log(`Generating seating for ${studentList.length} students, Exam Type: ${examType}`);
    console.log(`Generation options:`, genOptions);

    db.all("SELECT * FROM classrooms ORDER BY id ASC", [], (err, classrooms) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const normalizeDept = (dept) => {
            if (!dept) return 'Unknown';
            const d = dept.toString().toUpperCase().trim();
            if (d === 'CS' || d === 'CSE' || d === 'COMPUTER SCIENCE') return 'CSE';
            if (d === 'IS' || d === 'ISE' || d === 'INFORMATION SCIENCE') return 'ISE';
            if (d === 'EC' || d === 'ECE' || d === 'ELECTRONICS') return 'ECE';
            if (d === 'ME' || d === 'MECHANICAL') return 'ME';
            if (d === 'CV' || d === 'CIVIL') return 'CV';
            return d;
        };

        // Sort all students strictly by their Roll Number (USN) to ensure consecutive order
        studentList.sort((a, b) => a.u.localeCompare(b.u));

        // Group students by semester
        const uniqueSems = [...new Set(studentList.map(s => (s.s || '1').toString().trim()))].sort();
        
        let queueA = [];
        let queueB = [];

        if (uniqueSems.length >= 2) {
            // Alternate Semesters: Queue A gets Sem A, Queue B gets Sem B
            const semA = uniqueSems[0];
            const semB = uniqueSems[1];
            queueA = studentList.filter(s => (s.s || '1').toString().trim() === semA);
            queueB = studentList.filter(s => (s.s || '1').toString().trim() === semB);
            console.log(`Alternating Semesters: Queue A (Sem ${semA}) has ${queueA.length} students, Queue B (Sem ${semB}) has ${queueB.length} students.`);
        } else {
            // Alternate Departments: If only one semester is writing exams
            const uniqueDepts = [...new Set(studentList.map(s => normalizeDept(s.g)))].sort();
            if (uniqueDepts.length >= 2) {
                const deptA = uniqueDepts[0];
                const deptB = uniqueDepts[1];
                queueA = studentList.filter(s => normalizeDept(s.g) === deptA);
                queueB = studentList.filter(s => normalizeDept(s.g) === deptB);
                console.log(`Alternating Departments: Queue A (${deptA}) has ${queueA.length} students, Queue B (${deptB}) has ${queueB.length} students.`);
            } else {
                // Single Dept Fallback: Split the single department consecutively
                studentList.forEach((s, idx) => {
                    if (idx % 2 === 0) queueA.push(s);
                    else queueB.push(s);
                });
                console.log(`Fallback Single Queue: Split consecutively into Queue A (${queueA.length}) and Queue B (${queueB.length})`);
            }
        }

        let seatingPlan = [];
        const usedRoomIds = new Set();

        // Fill classrooms
        classrooms.forEach(room => {
            if (!genOptions.allowedRoomTypes.includes(room.room_type)) return;
            if (queueA.length === 0 && queueB.length === 0) return;

            // Get room capacity
            let capacity = room.internal_capacity || 40;
            if (genOptions.capacityOverrides && genOptions.capacityOverrides[room.room_type] !== undefined) {
                const override = parseInt(genOptions.capacityOverrides[room.room_type]);
                if (!isNaN(override) && override > 0) capacity = override;
            }

            const col1 = [];
            const col2 = [];
            const roomStudents = [];

            const col1Capacity = Math.ceil(capacity / 2);
            const col2Capacity = capacity - col1Capacity;

            // Fill Column 1 (Odd Seats: 1, 3, 5...)
            for (let i = 0; i < col1Capacity; i++) {
                if (queueA.length > 0) {
                    const student = queueA.shift();
                    const seatNum = 2 * i + 1;
                    const studentWithSeat = { ...student, seat: seatNum };
                    col1.push(studentWithSeat);
                    roomStudents.push(studentWithSeat);
                } else if (queueB.length > 0) {
                    // Fallback to Queue B if Queue A runs out
                    const student = queueB.shift();
                    const seatNum = 2 * i + 1;
                    const studentWithSeat = { ...student, seat: seatNum };
                    col1.push(studentWithSeat);
                    roomStudents.push(studentWithSeat);
                }
            }

            // Fill Column 2 (Even Seats: 2, 4, 6...) unless single seating (1-per-bench) is requested
            if (!genOptions.singleSeating) {
                for (let i = 0; i < col2Capacity; i++) {
                    if (queueB.length > 0) {
                        const student = queueB.shift();
                        const seatNum = 2 * i + 2;
                        const studentWithSeat = { ...student, seat: seatNum };
                        col2.push(studentWithSeat);
                        roomStudents.push(studentWithSeat);
                    } else if (queueA.length > 0) {
                        // Fallback to Queue A if Queue B runs out
                        const student = queueA.shift();
                        const seatNum = 2 * i + 2;
                        const studentWithSeat = { ...student, seat: seatNum };
                        col2.push(studentWithSeat);
                        roomStudents.push(studentWithSeat);
                    }
                }
            }

            if (roomStudents.length > 0) {
                usedRoomIds.add(room.id);
                seatingPlan.push({
                    roomId: room.id,
                    roomName: room.room_name,
                    floor: room.room_name.includes('1') ? 1 : (room.room_name.includes('2') ? 2 : 3),
                    students: roomStudents,
                    col1,
                    col2,
                    depts: [...new Set(roomStudents.map(s => normalizeDept(s.g)))],
                    semesters: [...new Set(roomStudents.map(s => (s.s || '1').toString().trim()))]
                });
                console.log(`Assigned ${roomStudents.length} students to ${room.room_name} (Col1: ${col1.length}, Col2: ${col2.length})`);
            }
        });

        // If there are still left-over students, place them in any remaining rooms
        if (queueA.length > 0 || queueB.length > 0) {
            console.log(`Warning: ${queueA.length + queueB.length} students could not be seated due to capacity limits.`);
        }

        const totalAssigned = seatingPlan.reduce((acc, p) => acc + p.students.length, 0);
        console.log(`Generation complete. Total assigned: ${totalAssigned}`);

        // Save Seating Plan to Database for static persistence
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("DELETE FROM seating_arrangements WHERE exam_id = ?", [examId]);
            
            const stmt = db.prepare("INSERT INTO seating_arrangements (exam_id, room_id, student_usn, student_name, student_dept, seat_number) VALUES (?, ?, ?, ?, ?, ?)");
            seatingPlan.forEach(room => {
                room.students.forEach(student => {
                    stmt.run(examId, room.roomId, student.u, student.n, student.g, student.seat);
                });
            });
            stmt.finalize();
            db.run("COMMIT", (commitErr) => {
                if (commitErr) return res.status(500).json({ error: commitErr.message });
                res.json({ seatingPlan });
            });
        });
    });
});

router.get('/load/:examId', (req, res) => {
    const examId = parseInt(req.params.examId);
    
    db.all(
        `SELECT sa.*, c.room_name, c.room_type 
         FROM seating_arrangements sa
         JOIN classrooms c ON sa.room_id = c.id
         WHERE sa.exam_id = ?
         ORDER BY c.id ASC, sa.seat_number ASC`,
        [examId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (rows.length === 0) {
                return res.json({ seatingPlan: [] });
            }
            
            const roomMap = {};
            rows.forEach(row => {
                if (!roomMap[row.room_id]) {
                    roomMap[row.room_id] = {
                        roomId: row.room_id,
                        roomName: row.room_name,
                        students: [],
                        col1: [],
                        col2: []
                    };
                }
                
                const student = {
                    u: row.student_usn,
                    n: row.student_name,
                    g: row.student_dept,
                    seat: row.seat_number
                };
                
                roomMap[row.room_id].students.push(student);
                
                // Reconstruct columns strictly by seat number parity
                if (row.seat_number % 2 === 1) {
                    roomMap[row.room_id].col1.push(student);
                } else {
                    roomMap[row.room_id].col2.push(student);
                }
            });
            
            const seatingPlan = Object.values(roomMap).map(room => {
                return {
                    roomId: room.roomId,
                    roomName: room.roomName,
                    students: room.students,
                    col1: room.col1,
                    col2: room.col2,
                    depts: [...new Set(room.students.map(s => s.g))],
                    semesters: []
                };
            });
            
            res.json({ seatingPlan });
        }
    );
});

module.exports = router;
