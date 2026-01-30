require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// USERS
// ==========================================
const users = {
    'Venkatakamesh': 'Venkatakamesh',
    'Chandrashekar': 'Chandrashekar',
    'Meenu': 'Meenu'
};

// ==========================================
// SESSIONS (In-Memory)
// ==========================================
const sessions = new Map();

// ==========================================
// MIDDLEWARE
// ==========================================
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

// ==========================================
// POSTGRESQL CONNECTION
// ==========================================
console.log('='.repeat(80));
console.log('CONNECTING TO DATABASE...');
console.log('='.repeat(80));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// ==========================================
// INITIALIZE DATABASE (AUTO CREATE TABLE)
// ==========================================
async function initializeDatabase() {
    try {
        console.log('Testing database connection...');
        
        // Test connection
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        console.log('📅 Database time:', testResult.rows[0].now);
        
        // Create table if it doesn't exist
        console.log('\nCreating table if not exists...');
        
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                task TEXT NOT NULL,
                client TEXT NOT NULL,
                team TEXT NOT NULL,
                username TEXT NOT NULL,
                hours INTEGER NOT NULL,
                minutes INTEGER NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        await pool.query(createTableSQL);
        console.log('✅ Table "tasks" is ready');
        
        // Create indexes
        console.log('Creating indexes...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(username)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
        console.log('✅ Indexes created');
        
        // Count existing records
        const countResult = await pool.query('SELECT COUNT(*) as count FROM tasks');
        console.log(`📊 Current records in database: ${countResult.rows[0].count}`);
        
        console.log('='.repeat(80));
        console.log('DATABASE READY ✅');
        console.log('='.repeat(80));
        
    } catch (error) {
        console.error('='.repeat(80));
        console.error('❌ DATABASE ERROR:');
        console.error('='.repeat(80));
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        if (error.detail) console.error('Detail:', error.detail);
        console.error('='.repeat(80));
        console.error('Please check:');
        console.error('1. DATABASE_URL environment variable is set');
        console.error('2. Neon database is accessible');
        console.error('3. Connection string includes ?sslmode=require');
        console.error('='.repeat(80));
        throw error;
    }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log('🔐 Login attempt:', username);
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (users[username] && users[username] === password) {
        const sessionId = Date.now().toString() + Math.random().toString(36).substring(2);
        sessions.set(sessionId, { username, loginTime: new Date() });
        console.log('✅ Login successful:', username);
        res.json({ success: true, sessionId, username });
    } else {
        console.log('❌ Login failed:', username);
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    const sid = req.headers['x-session-id'];
    if (sid && sessions.has(sid)) {
        console.log('👋 Logout:', sessions.get(sid).username);
        sessions.delete(sid);
    }
    res.json({ success: true });
});

// Auth middleware
function requireAuth(req, res, next) {
    const sid = req.headers['x-session-id'];
    if (!sid || !sessions.has(sid)) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    req.user = sessions.get(sid);
    next();
}

// GET all tasks
app.get('/api/tasks', requireAuth, async (req, res) => {
    console.log('📥 GET /api/tasks by', req.user.username);
    
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        console.log('✅ Retrieved', result.rows.length, 'tasks');
        res.json({ tasks: result.rows });
    } catch (error) {
        console.error('❌ SELECT error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET one task
app.get('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ task: result.rows[0] });
    } catch (error) {
        console.error('❌ SELECT error:', error);
        res.status(500).json({ error: error.message });
    }
});

// CREATE task
app.post('/api/tasks', requireAuth, async (req, res) => {
    const { task, client, team, user, hours, minutes, start_date, end_date, status } = req.body;
    
    console.log('📝 CREATE task request:');
    console.log('  User:', req.user.username);
    console.log('  Task:', task);
    console.log('  Client:', client);
    console.log('  Team:', team);
    console.log('  Assigned to:', user);
    console.log('  Hours:', hours, 'Minutes:', minutes);
    console.log('  Dates:', start_date, 'to', end_date);
    console.log('  Status:', status);
    
    // Validation
    if (!task || !client || !team || !user || 
        hours === undefined || minutes === undefined || 
        !start_date || !end_date || !status) {
        console.log('❌ Validation failed - missing fields');
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const sql = `
            INSERT INTO tasks (task, client, team, username, hours, minutes, start_date, end_date, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *
        `;
        
        const values = [task, client, team, user, 
                       parseInt(hours), parseInt(minutes), 
                       start_date, end_date, status];
        
        const result = await pool.query(sql, values);
        const newTask = result.rows[0];
        
        console.log('✅ Task created successfully!');
        console.log('  ID:', newTask.id);
        console.log('  Created at:', newTask.created_at);
        
        // Verify count
        const countResult = await pool.query('SELECT COUNT(*) as count FROM tasks');
        console.log('📊 Total tasks in database:', countResult.rows[0].count);
        
        res.json({
            message: 'Task created successfully',
            task: newTask
        });
        
    } catch (error) {
        console.error('='.repeat(80));
        console.error('❌ INSERT ERROR:');
        console.error('='.repeat(80));
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        if (error.detail) console.error('Detail:', error.detail);
        if (error.hint) console.error('Hint:', error.hint);
        console.error('='.repeat(80));
        res.status(500).json({ error: error.message });
    }
});

// UPDATE task
app.put('/api/tasks/:id', requireAuth, async (req, res) => {
    const { task, client, team, user, hours, minutes, start_date, end_date, status } = req.body;
    
    console.log('📝 UPDATE task', req.params.id);
    
    if (!task || !client || !team || !user || 
        hours === undefined || minutes === undefined || 
        !start_date || !end_date || !status) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const sql = `
            UPDATE tasks 
            SET task = $1, client = $2, team = $3, username = $4, 
                hours = $5, minutes = $6, start_date = $7, end_date = $8, 
                status = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;
        
        const values = [task, client, team, user, 
                       parseInt(hours), parseInt(minutes), 
                       start_date, end_date, status, req.params.id];
        
        const result = await pool.query(sql, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        console.log('✅ Task updated successfully');
        res.json({ message: 'Task updated successfully' });
        
    } catch (error) {
        console.error('❌ UPDATE error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE task
app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
    console.log('🗑️  DELETE task', req.params.id);
    
    try {
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        console.log('✅ Task deleted');
        res.json({ message: 'Task deleted successfully' });
        
    } catch (error) {
        console.error('❌ DELETE error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM tasks');
        res.json({
            status: 'ok',
            database: 'connected',
            taskCount: result.rows[0].count,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            database: 'error',
            error: error.message
        });
    }
});

// Root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// START SERVER
// ==========================================
async function startServer() {
    try {
        // Initialize database first
        await initializeDatabase();
        
        // Then start server
        app.listen(PORT, () => {
            console.log('');
            console.log('='.repeat(80));
            console.log('🚀 SERVER STARTED SUCCESSFULLY');
            console.log('='.repeat(80));
            console.log('Port:', PORT);
            console.log('URL: http://localhost:' + PORT);
            console.log('Status: READY ✅');
            console.log('='.repeat(80));
            console.log('');
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');
    await pool.end();
    process.exit(0);
});
