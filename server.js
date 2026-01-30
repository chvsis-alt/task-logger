require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple users database (username = password)
const users = {
    'Venkatakamesh': 'Venkatakamesh',
    'Chandrashekar': 'Chandrashekar',
    'Meenu': 'Meenu'
};

// Session store (in-memory for simplicity)
// Sessions remain active until explicit logout
const sessions = new Map();

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json());

// Session middleware (simple implementation)
app.use((req, res, next) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId && sessions.has(sessionId)) {
        req.session = sessions.get(sessionId);
    }
    next();
});

// Serve static files from 'public' directory
app.use(express.static('public'));

// Database setup with persistence verification
let db;

function initializeDB() {
    // Use absolute path to ensure database file location is consistent
    const dbPath = path.join(__dirname, 'tasklogger.db');
    
    console.log('📂 Database path:', dbPath);
    
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err);
            process.exit(1);
        } else {
            console.log('✅ Connected to SQLite database at:', dbPath);
            
            // Check if database file exists
            if (fs.existsSync(dbPath)) {
                console.log('✅ Database file exists');
                // Count existing records
                db.get('SELECT COUNT(*) as count FROM tasks', [], (err, row) => {
                    if (!err && row) {
                        console.log(`📊 Existing records in database: ${row.count}`);
                    }
                });
            } else {
                console.log('📝 Creating new database file');
            }
            
            initializeDatabase();
        }
    });
}

// Initialize database
initializeDB();

// Initialize database with schema
function initializeDatabase() {
    const schema = `
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task TEXT NOT NULL,
            client TEXT NOT NULL,
            team TEXT NOT NULL CHECK(team IN ('Build', 'Imp', 'Adhoc')),
            user TEXT NOT NULL,
            hours INTEGER NOT NULL CHECK(hours >= 0),
            minutes INTEGER NOT NULL CHECK(minutes >= 0 AND minutes < 60),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('yet to start', 'inprogress', 'completed')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user);
        CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_dates ON tasks(start_date, end_date);

        CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp 
        AFTER UPDATE ON tasks
        BEGIN
            UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `;
    
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error initializing database:', err);
        } else {
            console.log('✅ Database initialized successfully');
        }
    });
}

// API Endpoints

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Check credentials
    if (users[username] && users[username] === password) {
        // Create session
        const sessionId = Date.now().toString() + Math.random().toString(36);
        sessions.set(sessionId, { username, loginTime: new Date() });
        
        res.json({ 
            success: true, 
            sessionId,
            username 
        });
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
        sessions.delete(sessionId);
    }
    res.json({ success: true });
});

// Check session endpoint
app.get('/api/session', (req, res) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        res.json({ authenticated: true, username: session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// Middleware to protect routes
function requireAuth(req, res, next) {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}

// Get all tasks (protected)
app.get('/api/tasks', requireAuth, (req, res) => {
    const sql = 'SELECT * FROM tasks ORDER BY created_at DESC';
    console.log('📊 Fetching all tasks from database...');
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching tasks:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ Retrieved ${rows.length} tasks from database`);
        res.json({ tasks: rows });
    });
});

// Get single task by ID (protected)
app.get('/api/tasks/:id', requireAuth, (req, res) => {
    const sql = 'SELECT * FROM tasks WHERE id = ?';
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        res.json({ task: row });
    });
});

// Create new task (protected)
app.post('/api/tasks', requireAuth, (req, res) => {
    const { task, client, team, user, hours, minutes, start_date, end_date, status } = req.body;
    
    console.log('➕ Creating new task:', { task, client, team, user, status });
    
    // Validation
    if (!task || !client || !team || !user || hours === undefined || minutes === undefined || !start_date || !end_date || !status) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    const sql = `INSERT INTO tasks (task, client, team, user, hours, minutes, start_date, end_date, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [task, client, team, user, hours, minutes, start_date, end_date, status], function(err) {
        if (err) {
            console.error('❌ Error creating task:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`✅ Task created successfully with ID: ${this.lastID}`);
        res.json({
            message: 'Task created successfully',
            task: {
                id: this.lastID,
                task,
                client,
                team,
                user,
                hours,
                minutes,
                start_date,
                end_date,
                status
            }
        });
    });
});

// Update task (protected)
app.put('/api/tasks/:id', requireAuth, (req, res) => {
    const { task, client, team, user, hours, minutes, start_date, end_date, status } = req.body;
    
    // Validation
    if (!task || !client || !team || !user || hours === undefined || minutes === undefined || !start_date || !end_date || !status) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    const sql = `UPDATE tasks 
                 SET task = ?, client = ?, team = ?, user = ?, hours = ?, minutes = ?, 
                     start_date = ?, end_date = ?, status = ?
                 WHERE id = ?`;
    
    db.run(sql, [task, client, team, user, hours, minutes, start_date, end_date, status, req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        res.json({
            message: 'Task updated successfully',
            changes: this.changes
        });
    });
});

// Delete task (protected)
app.delete('/api/tasks/:id', requireAuth, (req, res) => {
    const sql = 'DELETE FROM tasks WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        res.json({
            message: 'Task deleted successfully',
            changes: this.changes
        });
    });
});

// Statistics endpoint
app.get('/api/stats', (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_tasks,
            SUM(hours * 60 + minutes) as total_minutes,
            team,
            status
        FROM tasks
        GROUP BY team, status
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ stats: rows });
    });
});

// Export to Excel endpoint
app.get('/api/export', (req, res) => {
    const sql = 'SELECT * FROM tasks ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Create CSV content
        const headers = ['ID', 'Task', 'Client', 'Team', 'User', 'Hours', 'Minutes', 'Start Date', 'End Date', 'Status', 'Created At', 'Updated At'];
        const csvRows = [headers.join(',')];
        
        rows.forEach(row => {
            const values = [
                row.id,
                `"${row.task.replace(/"/g, '""')}"`,
                `"${row.client.replace(/"/g, '""')}"`,
                row.team,
                row.user,
                row.hours,
                row.minutes,
                row.start_date,
                row.end_date,
                row.status,
                row.created_at,
                row.updated_at
            ];
            csvRows.push(values.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=task-logs-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🚀 Task Hour Logger Server Started!     ║
╚════════════════════════════════════════════╝

📍 Local:            http://localhost:${PORT}
📊 API Endpoint:     http://localhost:${PORT}/api/tasks
📁 Static Files:     ${path.join(__dirname, 'public')}
💾 Database:         ${path.join(__dirname, 'tasklogger.db')}

✨ Server is ready! Open your browser to http://localhost:${PORT}

Press Ctrl+C to stop the server
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('\n✅ Database connection closed');
        }
        process.exit(0);
    });
});
