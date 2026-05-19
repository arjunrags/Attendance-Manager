const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const initDb = async () => {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            db.run("PRAGMA foreign_keys = ON");
            db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, role TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            db.run(`CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, scheme TEXT, semester INTEGER, subject_code TEXT, subject_name TEXT)`);
            db.run(`CREATE TABLE IF NOT EXISTS exams (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_type TEXT, exam_name TEXT, semester INTEGER DEFAULT 1, start_date TEXT, end_date TEXT, start_time TEXT, end_time TEXT, duration TEXT, exams_per_day INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            db.run(`CREATE TABLE IF NOT EXISTS classrooms (id INTEGER PRIMARY KEY AUTOINCREMENT, room_name TEXT UNIQUE, room_type TEXT DEFAULT 'classroom', vtu_capacity INTEGER DEFAULT 30, internal_capacity INTEGER DEFAULT 40)`);
            db.run(`CREATE TABLE IF NOT EXISTS seating_arrangements (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER, room_id INTEGER, student_usn TEXT, student_name TEXT, student_dept TEXT, seat_number INTEGER, allocation_date DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            db.run(`CREATE TABLE IF NOT EXISTS exam_schedule (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER, exam_date TEXT, session TEXT, subject_id INTEGER, FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE, FOREIGN KEY(subject_id) REFERENCES subjects(id))`);

            // 2. Perform Seeding (Async/Awaited correctly within the serialize context or after)
            try {
                const adminHash = await bcrypt.hash('admin123', 10);
                const facultyHash = await bcrypt.hash('faculty123', 10);
                
                db.run(`INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['admin', adminHash, 'admin']);
                db.run(`INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['faculty', facultyHash, 'faculty']);

                db.get("SELECT COUNT(*) as count FROM classrooms", (err, row) => {
                    if (row && row.count === 0) {
                        const stmt = db.prepare(`INSERT INTO classrooms (room_name, room_type, vtu_capacity, internal_capacity) VALUES (?, ?, ?, ?)`);
                        
                        // Seed C Block Classrooms
                        const cClassrooms = [
                            ...Array.from({length: 6}, (_, i) => `LH${101 + i}`),
                            ...Array.from({length: 7}, (_, i) => `LH${201 + i}`),
                            ...Array.from({length: 7}, (_, i) => `LH${301 + i}`),
                            ...Array.from({length: 6}, (_, i) => `LH${401 + i}`),
                            ...Array.from({length: 7}, (_, i) => `LH${501 + i}`)
                        ];
                        for (const room of cClassrooms) { stmt.run(room, 'classroom', 30, 40); }
                        
                        // Seed Labs (C Block + D Block)
                        const labs = [
                            // D block labs
                            'ME001', 'ME101', 'ME201', 'ME202', 'ME203', 'ME204', 'ME205',
                            'DL001', 'DL002', 'DL003', 'DL004', 'DL005',
                            'CV301', 'CV302', 'CV303',
                            'CV400', 'CV401', 'CV402', 'CV403', 'CV404',
                            // C block labs
                            'L101', 'L102', 'L103',
                            'L212', 'L213', 'L214',
                            ...Array.from({length: 7}, (_, i) => `L${301 + i}`),
                            ...Array.from({length: 6}, (_, i) => `L${401 + i}`),
                            ...Array.from({length: 6}, (_, i) => `L${501 + i}`)
                        ];
                        for (const lab of labs) { stmt.run(lab, 'lab', 20, 20); }
                        
                        stmt.finalize();
                    }
                });

                seedSubjects();
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
};

function seedSubjects() {
    console.log("Refreshing subjects database...");
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM subjects");
        
        const schemes = ['2022 Scheme', '2025 Scheme'];
        const subjectsData = {
            1: [ // Physics Cycle
                { name: 'Mathematics for Computer Science-I', code: 'MATC11' },
                { name: 'Applied Physics', code: 'PHYS12' },
                { name: 'Principles of Programming in C', code: 'POPC13' },
                { name: 'Basic Electronics & Communication', code: 'BECC14' },
                { name: 'Introduction to Web Programming', code: 'WPC15' },
                { name: 'Communicative English', code: 'ENGL16' }
            ],
            2: [ // Chemistry Cycle
                { name: 'Mathematics for Computer Science-II', code: 'MATC21' },
                { name: 'Applied Chemistry', code: 'CHEM22' },
                { name: 'Computer Aided Engineering Drawing', code: 'CAED23' },
                { name: 'Basic Electrical Engineering', code: 'ELEC24' },
                { name: 'Introduction to Python Programming', code: 'PYC25' },
                { name: 'Professional Writing Skills', code: 'PWRS26' }
            ],
            3: [
                { name: 'Mathematics for Computer Science', code: 'MTC31' },
                { name: 'Data Structures and Applications', code: 'DSA32' },
                { name: 'Computer Organization & Architecture', code: 'COA33' },
                { name: 'Object Oriented Programming with Java', code: 'OOJ34' },
                { name: 'Digital Ecosystem', code: 'DES35' },
                { name: 'Social Connect and Responsibilities', code: 'SCR36' }
            ],
            4: [
                { name: 'Design and Analysis of Algorithms', code: 'DAA41' },
                { name: 'Microcontroller and Embedded Systems', code: 'MES42' },
                { name: 'Operating Systems', code: 'OS43' },
                { name: 'Discrete Mathematical Structures', code: 'DMS44' },
                { name: 'Theory of Computation', code: 'TOC45' },
                { name: 'Biology for Engineers', code: 'BIO46' }
            ],
            5: [
                { name: 'Software Engineering & Project Mgmt', code: 'SEPM51' },
                { name: 'Computer Networks', code: 'NET52' },
                { name: 'Database Management Systems', code: 'DBMS53' },
                { name: 'Artificial Intelligence', code: 'AI54' },
                { name: 'Full Stack Development', code: 'FSD55' },
                { name: 'Cyber Security', code: 'CYS56' }
            ],
            6: [
                { name: 'Machine Learning', code: 'ML61' },
                { name: 'Cloud Computing', code: 'CC62' },
                { name: 'Internet of Things', code: 'IOT63' },
                { name: 'Blockchain Technology', code: 'BT64' },
                { name: 'Natural Language Processing', code: 'NLP65' },
                { name: 'Compiler Design', code: 'CD66' }
            ],
            7: [
                { name: 'Big Data Analytics', code: 'BDA71' },
                { name: 'Deep Learning', code: 'DL72' },
                { name: 'Digital Image Processing', code: 'DIP73' },
                { name: 'User Interface Design', code: 'UID74' },
                { name: 'Software Testing', code: 'ST75' }
            ],
            8: [
                { name: 'Professional Elective-V', code: 'PE81' },
                { name: 'Open Elective-IV', code: 'OE82' },
                { name: 'Internship', code: 'INT83' },
                { name: 'Project Work Phase-2', code: 'PRJ84' },
                { name: 'Technical Seminar', code: 'SEM85' }
            ]
        };

        const stmt = db.prepare(`INSERT INTO subjects (scheme, semester, subject_code, subject_name) VALUES (?, ?, ?, ?)`);
        schemes.forEach(scheme => {
            const prefix = scheme.includes('2022') ? '22' : '25';
            for (const sem in subjectsData) {
                subjectsData[sem].forEach(sub => {
                    const fullCode = prefix + sub.code;
                    stmt.run(scheme, parseInt(sem), fullCode, sub.name);
                });
            }
        });
        stmt.finalize();
        db.run("COMMIT");
    });
}

module.exports = { db, initDb };
