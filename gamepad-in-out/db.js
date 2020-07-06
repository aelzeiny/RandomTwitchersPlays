/**
 * Does this project even need a database? Not really. But I'd like to have one for
 * (A) Tracking / Statistics
 * (B) Parallelism (I shouldn't have 2 websocket servers, 1 HTTP server, and 1 chatbot on the same NodeJS thread
 *                  & expect high throughput)
 * (C) Future-proofing (aka over-engineering)
 *
 * SQL-Lite for now with no ORM and no Migrations. Fight me.
 */

const sqlite3 = require('sqlite3').verbose();
const { dbPath } = require('./configs');
const { generateUUID } = require('./urlGenerator');


const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(
        `CREATE TABLE IF NOT EXISTS queue (
            uuid CHARACTER(36) PRIMARY KEY,
            username VARCHAR(256) NOT NULL, 
            joinedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            startedAt TIMESTAMP
        )`
    );
    db.run(`CREATE INDEX IF NOT EXISTS quser ON queue(username, startedAt)`);
    db.run(`CREATE INDEX IF NOT EXISTS qstarted ON queue(startedAt)`);
});

function close() {
    db.close();
}

function getQueueUsernames() {
    return new Promise(((resolve, reject) => {
        db.serialize(() => {
            db.all(`SELECT username FROM queue WHERE startedAt IS NULL ORDER BY joinedAt LIMIT 15`, (err, rows) => {
                if (err)
                    return reject(err);
                return resolve(rows.map(x => x.username));
            });
        });
    }));
}


function getUUID(username) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT uuid FROM queue WHERE username = ? AND startedAt IS NULL`, username, (err, record) => {
            if (err)
                return reject(err);
            return resolve(record);
        });
    });
}

function search(uuid) {
    return new Promise(((resolve, reject) => {
        db.get('SELECT * FROM queue WHERE uuid = ?', uuid, (err, record) => {
            if (err)
                return reject(err);
            return resolve(record);
        });
    }))
}


function enqueue(username) {
    return new Promise(((resolve, reject) => {
        getUUID().then(existingRecord => {
            if (existingRecord)
                return resolve(existingRecord.uuid);
            const uuid = generateUUID();
            db.run(`INSERT INTO queue (uuid, username) VALUES (?, ?)`, uuid, username, (err) => {
                if (err)
                    return reject(err);
                return resolve(uuid);
            });
        }).catch(reject);
    }));
}

function dequeue(uuid) {
    return new Promise(((resolve, reject) => {
        db.run(`DELETE FROM queue WHERE uuid = ?`, uuid, (err) => {
            if (err)
                return reject(err);
            return resolve();
        });
    }));
}

function dequeueUser(username) {
    return new Promise(((resolve, reject) => {
        db.run(`DELETE FROM queue WHERE username = ? AND startedAt IS NULL`, username, (err) => {
            if (err)
                return reject(err);
            return resolve();
        });
    }));
}


module.exports = { close, enqueue, getQueueUsernames, search, dequeue, dequeueUser};


