require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Sessions
const sessions = new Map();

// Password reset tokens (in production, use Redis or database)
const resetTokens = new Map();

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

// PostgreSQL Connection
console.log('='.repeat(80));
console.log('CONNECTING TO DATABASE...');
console.log('='.repeat(80));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Hash password function
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Initialize Database
async function initializeDatabase() {
    try {
        console.log('Testing database connection...');
        
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        console.log('📅 Database time:', testResult.rows[0].now);
        
        // Create users table
        console.log('\nCreating users table...');
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(createUsersTable);
        console.log('✅ Users table ready');
        
        // Create default users if they don't exist
        const defaultUsers = [
            { username: 'Venkatakamesh', password: 'Venkatakamesh' },
            { username: 'Chandrashekar', password: 'Chandrashekar' },
            { username: 'Meenu', password: 'Meenu' }
        ];
        
        for (const user of defaultUsers) {
            const checkUser = await pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
            if (checkUser.rows.length === 0) {
                await pool.query(
                    'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
                    [user.username, hashPassword(user.password)]
                );
                console.log(`✅ Created default user: ${user.username}`);
            }
        }
        
        // Drop old tasks table if it exists with wrong schema
        console.log('\nChecking tasks table schema...');
        const checkOldTable = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name IN ('user', 'username')
        `);
        
        if (checkOldTable.rows.length > 0) {
            console.log('⚠️  Found old table with wrong schema');
            console.log('Dropping old table...');
            await pool.query('DROP TABLE IF EXISTS tasks CASCADE');
            console.log('✅ Old table dropped');
        }
        
        // Create tasks table with platform column
        console.log('Creating tasks table...');
        const createTasksTable = `
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                task TEXT NOT NULL,
                client TEXT NOT NULL,
                platform TEXT NOT NULL,
                team TEXT NOT NULL,
                task_user TEXT NOT NULL,
                hours INTEGER NOT NULL,
                minutes INTEGER NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                status TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(createTasksTable);
        console.log('✅ Tasks table ready');
        
        // Create indexes
        console.log('Creating indexes...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(task_user)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_platform ON tasks(platform)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_dates ON tasks(start_date, end_date)');
        console.log('✅ Indexes created');
        
        // Count records
        const taskCount = await pool.query('SELECT COUNT(*) as count FROM tasks');
        const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log(`📊 Users in database: ${userCount.rows[0].count}`);
        console.log(`📊 Tasks in database: ${taskCount.rows[0].count}`);
        
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
        throw error;
    }
}

// ==========================================
// AUTH ENDPOINTS
// ==========================================

// Signup
app.post('/api/signup', async (req, res) => {
    const { username, password, email } = req.body;
    
    console.log('📝 Signup attempt:', username);
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    if (password.length < 3) {
        return res.status(400).json({ error: 'Password must be at least 3 characters' });
    }
    
    try {
        // Check if user exists
        const checkUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Create user
        const passwordHash = hashPassword(password);
        await pool.query(
            'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3)',
            [username, passwordHash, email || null]
        );
        
        console.log('✅ User created:', username);
        res.json({ success: true, message: 'Account created successfully! Please login.' });
        
    } catch (error) {
        console.error('❌ Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', username);
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    try {
        // Get user from database
        const result = await pool.query(
            'SELECT id, username, password_hash FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const user = result.rows[0];
        const passwordHash = hashPassword(password);
        
        if (user.password_hash !== passwordHash) {
            console.log('❌ Wrong password for:', username);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Create session
        const sessionId = Date.now().toString() + Math.random().toString(36).substring(2);
        sessions.set(sessionId, { username: user.username, userId: user.id, loginTime: new Date() });
        
        console.log('✅ Login successful:', username);
        res.json({ success: true, sessionId, username: user.username });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
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

// Request password reset
app.post('/api/reset-password-request', async (req, res) => {
    const { username } = req.body;
    
    console.log('🔑 Password reset requested for:', username);
    
    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }
    
    try {
        // Check if user exists
        const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            // Don't reveal if user exists or not
            return res.json({ success: true, message: 'If the username exists, a reset code has been generated.' });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
        resetTokens.set(username, {
            token: resetToken,
            expires: Date.now() + 15 * 60 * 1000 // 15 minutes
        });
        
        console.log('✅ Reset token generated for:', username);
        console.log('🔑 Reset code:', resetToken);
        
        res.json({ 
            success: true, 
            message: 'Reset code generated',
            resetCode: resetToken // In production, send via email instead
        });
        
    } catch (error) {
        console.error('❌ Reset request error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Reset password with token
app.post('/api/reset-password', async (req, res) => {
    const { username, resetCode, newPassword } = req.body;
    
    console.log('🔑 Password reset attempt for:', username);
    
    if (!username || !resetCode || !newPassword) {
        return res.status(400).json({ error: 'All fields required' });
    }
    
    if (newPassword.length < 3) {
        return res.status(400).json({ error: 'Password must be at least 3 characters' });
    }
    
    try {
        // Check reset token
        const tokenData = resetTokens.get(username);
        
        if (!tokenData) {
            return res.status(400).json({ error: 'Invalid or expired reset code' });
        }
        
        if (Date.now() > tokenData.expires) {
            resetTokens.delete(username);
            return res.status(400).json({ error: 'Reset code has expired' });
        }
        
        if (tokenData.token !== resetCode.toUpperCase()) {
            return res.status(400).json({ error: 'Invalid reset code' });
        }
        
        // Update password
        const passwordHash = hashPassword(newPassword);
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2',
            [passwordHash, username]
        );
        
        // Clear reset token
        resetTokens.delete(username);
        
        console.log('✅ Password reset successful for:', username);
        res.json({ success: true, message: 'Password reset successfully! Please login.' });
        
    } catch (error) {
        console.error('❌ Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
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

// ==========================================
// TASK ENDPOINTS
// ==========================================

// GET all tasks
app.get('/api/tasks', requireAuth, async (req, res) => {
    console.log('📥 GET /api/tasks by', req.user.username);
    
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        
        // Map task_user to user for frontend compatibility
        const tasks = result.rows.map(task => ({
            ...task,
            user: task.task_user
        }));
        
        console.log('✅ Retrieved', tasks.length, 'tasks');
        res.json({ tasks: tasks });
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
        
        const task = {
            ...result.rows[0],
            user: result.rows[0].task_user
        };
        
        res.json({ task: task });
    } catch (error) {
        console.error('❌ SELECT error:', error);
        res.status(500).json({ error: error.message });
    }
});

// CREATE task
app.post('/api/tasks', requireAuth, async (req, res) => {
    const { task, client, platform, team, user, hours, minutes, start_date, end_date, status } = req.body;
    
    console.log('='.repeat(80));
    console.log('📝 CREATE TASK REQUEST');
    console.log('='.repeat(80));
    console.log('Authenticated user:', req.user.username);
    console.log('Task data:', { task, client, platform, team, user, hours, minutes, start_date, end_date, status });
    
    // Validation
    if (!task || !client || !platform || !team || !user || 
        hours === undefined || minutes === undefined || 
        !start_date || !end_date || !status) {
        console.log('❌ VALIDATION FAILED - Missing fields');
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const sql = `
            INSERT INTO tasks (task, client, platform, team, task_user, hours, minutes, start_date, end_date, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *
        `;
        
        const values = [
            task, 
            client,
            platform,
            team, 
            user,
            parseInt(hours), 
            parseInt(minutes), 
            start_date, 
            end_date, 
            status
        ];
        
        console.log('Executing INSERT with values:', values);
        
        const result = await pool.query(sql, values);
        const newTask = result.rows[0];
        
        const taskResponse = {
            ...newTask,
            user: newTask.task_user
        };
        
        console.log('='.repeat(80));
        console.log('✅ TASK CREATED SUCCESSFULLY!');
        console.log('='.repeat(80));
        console.log('Task ID:', newTask.id);
        console.log('User:', newTask.task_user);
        console.log('Platform:', newTask.platform);
        console.log('Created at:', newTask.created_at);
        console.log('='.repeat(80));
        
        const countResult = await pool.query('SELECT COUNT(*) as count FROM tasks');
        console.log('📊 Total tasks in database:', countResult.rows[0].count);
        
        res.json({
            message: 'Task created successfully',
            task: taskResponse
        });
        
    } catch (error) {
        console.log('='.repeat(80));
        console.log('❌ INSERT ERROR');
        console.log('='.repeat(80));
        console.log('Error message:', error.message);
        console.log('Error code:', error.code);
        if (error.detail) console.log('Error detail:', error.detail);
        if (error.hint) console.log('Error hint:', error.hint);
        console.log('='.repeat(80));
        
        res.status(500).json({ 
            error: 'Database error: ' + error.message
        });
    }
});

// UPDATE task
app.put('/api/tasks/:id', requireAuth, async (req, res) => {
    const { task, client, platform, team, user, hours, minutes, start_date, end_date, status } = req.body;
    
    console.log('📝 UPDATE task', req.params.id);
    
    if (!task || !client || !platform || !team || !user || 
        hours === undefined || minutes === undefined || 
        !start_date || !end_date || !status) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const sql = `
            UPDATE tasks 
            SET task = $1, client = $2, platform = $3, team = $4, task_user = $5, 
                hours = $6, minutes = $7, start_date = $8, end_date = $9, 
                status = $10, updated_at = CURRENT_TIMESTAMP
            WHERE id = $11
            RETURNING *
        `;
        
        const values = [
            task, 
            client,
            platform,
            team, 
            user,
            parseInt(hours), 
            parseInt(minutes), 
            start_date, 
            end_date, 
            status, 
            req.params.id
        ];
        
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
        const taskCount = await pool.query('SELECT COUNT(*) as count FROM tasks');
        const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
        res.json({
            status: 'ok',
            database: 'connected',
            taskCount: taskCount.rows[0].count,
            userCount: userCount.rows[0].count,
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

// Start Server
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log('');
            console.log('='.repeat(80));
            console.log('🚀 SERVER STARTED SUCCESSFULLY');
            console.log('='.repeat(80));
            console.log('Port:', PORT);
            console.log('Status: READY ✅');
            console.log('='.repeat(80));
            console.log('');
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');
    await pool.end();
    process.exit(0);
});
