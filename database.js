// Database Configuration
// Supports both SQLite (local) and PostgreSQL (hosted)

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database type - change to 'postgres' for hosted database
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

// PostgreSQL configuration (if using hosted database)
const PG_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tasklogger',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
};

let db;

// Initialize SQLite
function initSQLite() {
    const dbPath = path.join(__dirname, 'tasklogger.db');
    console.log('📂 SQLite Database path:', dbPath);
    
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Error opening SQLite database:', err);
            process.exit(1);
        }
        
        console.log('✅ Connected to SQLite database');
        
        // Verify file exists and check records
        if (fs.existsSync(dbPath)) {
            db.get('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name="tasks"', [], (err, row) => {
                if (!err && row && row.count > 0) {
                    db.get('SELECT COUNT(*) as count FROM tasks', [], (err, row) => {
                        if (!err && row) {
                            console.log(`📊 Existing records: ${row.count}`);
                        }
                    });
                }
            });
        }
    });
    
    return {
        type: 'sqlite',
        query: (sql, params, callback) => {
            db.all(sql, params, callback);
        },
        run: (sql, params, callback) => {
            db.run(sql, params, callback);
        },
        get: (sql, params, callback) => {
            db.get(sql, params, callback);
        }
    };
}

// Initialize PostgreSQL (for hosted database)
function initPostgreSQL() {
    const { Client } = require('pg');
    const client = new Client(PG_CONFIG);
    
    client.connect((err) => {
        if (err) {
            console.error('❌ Error connecting to PostgreSQL:', err);
            process.exit(1);
        }
        console.log('✅ Connected to PostgreSQL database');
    });
    
    return {
        type: 'postgres',
        query: (sql, params, callback) => {
            // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
            let pgSql = sql;
            let pgParams = params;
            if (params && params.length > 0) {
                params.forEach((param, index) => {
                    pgSql = pgSql.replace('?', `$${index + 1}`);
                });
            }
            
            client.query(pgSql, pgParams, (err, result) => {
                if (err) return callback(err);
                callback(null, result.rows);
            });
        },
        run: (sql, params, callback) => {
            let pgSql = sql;
            if (params && params.length > 0) {
                params.forEach((param, index) => {
                    pgSql = pgSql.replace('?', `$${index + 1}`);
                });
            }
            
            client.query(pgSql, params, (err, result) => {
                if (err) return callback.call({ lastID: null }, err);
                callback.call({ 
                    lastID: result.rows[0]?.id,
                    changes: result.rowCount 
                });
            });
        },
        get: (sql, params, callback) => {
            let pgSql = sql;
            if (params && params.length > 0) {
                params.forEach((param, index) => {
                    pgSql = pgSql.replace('?', `$${index + 1}`);
                });
            }
            
            client.query(pgSql, params, (err, result) => {
                if (err) return callback(err);
                callback(null, result.rows[0]);
            });
        }
    };
}

// Initialize based on DB_TYPE
function initializeDB() {
    if (DB_TYPE === 'postgres') {
        console.log('🐘 Using PostgreSQL database (hosted)');
        return initPostgreSQL();
    } else {
        console.log('📦 Using SQLite database (local)');
        return initSQLite();
    }
}

module.exports = { initializeDB };
