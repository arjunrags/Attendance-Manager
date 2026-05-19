const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('server/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM classrooms LIMIT 5", [], (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
