require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Users
const users = {
    'Venkatakamesh': 'Venkatakamesh',
    'Chandrashekar': 'Chandrashekar',
    'Meenu': 'Meenu'
};

// Sessions
const sessions = new Map();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use((req, res, next) => {
    const sessionId = req.headers['x-session-id'];
    if (sessionId && sessions.has(sessionId)) {
        req.session = sessions.get(sessionId);
    }
    next();
});
app.use(express.static('public'));

// PostgreSQL Pool
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

console.log('DATABASE HOST:', process.env.DB_HOST);
console.log('DATABASE NAME:', process.env.DB_NAME);

// Test connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('DB CONNECTION FAILED:', err.message);
    } else {
        console.log('DB CONNECTED ✅');
        pool.query('SELECT COUNT(*) as count FROM tasks', (err, res) => {
            if (!err) console.log('TASKS IN DB:', res.rows[0].count);
        });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        const sessionId = Date.now() + '' + Math.random();
        sessions.set(sessionId, { username });
        console.log('LOGIN:', username);
        res.json({ success: true, sessionId, username });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    const sid = req.headers['x-session-id'];
    if (sid) sessions.delete(sid);
    res.json({ success: true });
});

// Auth
function requireAuth(req, res, next) {
    const sid = req.headers['x-session-id'];
    if (!sid || !sessions.has(sid)) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    req.user = sessions.get(sid);
    next();
}

// GET tasks
app.get('/api/tasks', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        console.log('GET TASKS:', result.rows.length);
        res.json({ tasks: result.rows });
    } catch (err) {
        console.error('GET ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET one
app.get('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json({ task: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
app.post('/api/tasks', requireAuth, async (req, res) => {
    const { task, client, team, user, hours, minutes, start_date, end_date, status } = req.body;
    
    console.log('CREATE:', { task, user, status });
    
    if (!task || !client || !team || !user || hours === undefined || minutes === undefined || !start_date || !end_date || !status) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        const sql = 'INSERT INTO tasks (task, client, team, username, hours, minutes, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *';
        const result = await pool.query(sql, [task, client, team, user, hours, minutes, start_date, end_date, status]);
        console.log('CREATED ID:', result.rows[0].id);
        res.json({ message: 'Created', task: result.rows[0] });
    } catch (err) {
        console.error('CREATE ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
app.put('/api/tasks/:id', requireAuth, async (req, res) => {
    const { task, client, team, user, hours, minutes, start_date, end_date, status } = req.body;
    
    if (!task || !client || !team || !user || hours === undefined || minutes === undefined || !start_date || !end_date || !status) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        const sql = 'UPDATE tasks SET task=$1, client=$2, team=$3, username=$4, hours=$5, minutes=$6, start_date=$7, end_date=$8, status=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$10 RETURNING *';
        const result = await pool.query(sql, [task, client, team, user, hours, minutes, start_date, end_date, status, req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        console.log('UPDATED:', req.params.id);
        res.json({ message: 'Updated' });
    } catch (err) {
        console.error('UPDATE ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE
app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        console.log('DELETED:', req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM tasks');
        res.json({ status: 'ok', tasks: result.rows[0].count });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
app.listen(PORT, () => {
    console.log('SERVER RUNNING ON PORT:', PORT);
});
