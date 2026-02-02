-- ========================================
-- TASK LOGGER - DATABASE SETUP
-- Run this in Neon SQL Editor
-- ========================================

-- Drop existing table if it has wrong schema
DROP TABLE IF EXISTS tasks CASCADE;

-- Create tasks table with correct schema
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    task TEXT NOT NULL,
    client TEXT NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX idx_tasks_user ON tasks(task_user);
CREATE INDEX idx_tasks_team ON tasks(team);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_dates ON tasks(start_date, end_date);

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- Show initial count (should be 0)
SELECT COUNT(*) as total_tasks FROM tasks;
