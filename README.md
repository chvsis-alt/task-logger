# Task Hour Logger - Cloud Version

Cloud deployment with PostgreSQL.

## Quick Setup

1. **Neon**: Create database → Run CREATE TABLE SQL
2. **GitHub**: Push code
3. **Render**: Deploy with environment variables

See **DEPLOY.md** for complete guide.

## SQL for Neon

```sql
CREATE TABLE tasks (
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

CREATE INDEX idx_tasks_user ON tasks(username);
CREATE INDEX idx_tasks_team ON tasks(team);
CREATE INDEX idx_tasks_status ON tasks(status);
```

## Environment Variables (Render)

```
DB_HOST = your-neon-host
DB_PORT = 5432
DB_NAME = tasklogger
DB_USER = your-username
DB_PASSWORD = your-password
```

## Users

- Venkatakamesh / Venkatakamesh
- Chandrashekar / Chandrashekar
- Meenu / Meenu

## Features

- 15 Clients (including Oscar Lite)
- 4 Teams (including Oscar Lite)  
- Column filters
- Excel export (IST timezone)
- Persistent cloud database

## Files

- `server.js` - PostgreSQL server
- `public/index.html` - Login
- `public/app.html` - Main app
- `DEPLOY.md` - Full guide

---

**Need Help?** See DEPLOY.md for troubleshooting.
