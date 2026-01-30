# Task Hour Logger - Ready to Use Package

## ✅ This Package is Ready to Run!

Everything is configured and tested. Just follow the steps below.

---

## 📁 What's Included

```
task-logger/
├── server.js          ← Backend server (Node.js + Express)
├── package.json       ← Dependencies list
├── .gitignore        ← Git ignore file
└── public/
    └── index.html    ← Frontend application
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Node.js
If you haven't already, download and install Node.js from:
**https://nodejs.org** (Download the LTS version)

### Step 2: Install Dependencies
Open terminal/command prompt in this folder and run:
```bash
npm install
```

### Step 3: Start the Server
```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════╗
║   🚀 Task Hour Logger Server Started!     ║
╚════════════════════════════════════════════╝

📍 Local:            http://localhost:3000
```

### Step 4: Open Your Browser
Go to: **http://localhost:3000**

**That's it! Your app is running!** 🎉

---

## ✨ Features

- ✅ Add tasks with 8 fields (Task, Client, Team, User, Hours, Start/End Dates, Status)
- ✅ Edit any task (click the edit icon)
- ✅ Delete tasks (click the delete icon)
- ✅ All data saved to SQLite database
- ✅ Responsive design (works on mobile, tablet, desktop)
- ✅ Modern dark theme UI

---

## 🗄️ Database

The app automatically creates a **tasklogger.db** file in this folder.

- **Type**: SQLite database
- **Location**: Same folder as server.js
- **Backup**: Simply copy the .db file

To view the database:
```bash
sqlite3 tasklogger.db
.tables
SELECT * FROM tasks;
.exit
```

---

## 🌐 Deploy Online

### Option 1: Railway.app (Easiest, Free)

1. Create account at **https://railway.app**
2. Connect GitHub
3. Upload these files to GitHub
4. Deploy from GitHub on Railway
5. Get your live URL!

### Option 2: Render.com (Also Free)

1. Create account at **https://render.com**
2. New → Web Service
3. Connect your GitHub repo
4. Deploy!

See `DEPLOYMENT.md` for detailed instructions.

---

## 🔧 Troubleshooting

### "Cannot find module 'express'"
```bash
npm install
```

### "Port 3000 already in use"
```bash
# On Mac/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Or use different port:
PORT=3001 npm start
```

### "Cannot GET /" in browser
Make sure:
1. ✅ Server is running (you should see the startup message)
2. ✅ You're visiting `http://localhost:3000` (not https)
3. ✅ The `public/index.html` file exists

### Database errors
```bash
# Delete and restart:
rm tasklogger.db
npm start
```

---

## 📊 API Endpoints

If you want to integrate with other apps:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | Get all tasks |
| GET | /api/tasks/:id | Get one task |
| POST | /api/tasks | Create new task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| GET | /api/stats | Get statistics |

Example:
```bash
curl http://localhost:3000/api/tasks
```

---

## 🎨 Customization

### Add New Users
Edit `public/index.html`, find the user dropdown:
```html
<select id="user" required>
    <option value="Venkatakamesh">Venkatakamesh</option>
    <option value="Chandrashekar">Chandrashekar</option>
    <option value="Meenu">Meenu</option>
    <option value="YourName">YourName</option>  ← Add here
</select>
```

Also update the CHECK constraint in `server.js` line 27.

### Change Colors
Edit `public/index.html`, find the CSS variables:
```css
:root {
    --accent-primary: #00d9ff;    ← Change these
    --accent-secondary: #7c3aed;  ← colors
}
```

### Change Port
```bash
PORT=8080 npm start
```

---

## 💾 Backup Your Data

To backup all your task data:
```bash
# Simply copy the database file:
cp tasklogger.db tasklogger_backup.db
```

To restore:
```bash
cp tasklogger_backup.db tasklogger.db
```

---

## 🛑 Stop the Server

Press **Ctrl+C** in the terminal where the server is running.

---

## 📝 Development Mode

For auto-restart on file changes:
```bash
npm install -g nodemon
nodemon server.js
```

---

## ✅ Testing Checklist

- [ ] Server starts without errors
- [ ] Can add a new task
- [ ] Can edit a task
- [ ] Can delete a task
- [ ] Data persists after page refresh
- [ ] All dropdowns work
- [ ] Date pickers work
- [ ] Time input (hours/minutes) works

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Make sure Node.js is installed (`node --version`)
3. Make sure dependencies are installed (`npm install`)
4. Check server logs in the terminal

---

## 🎉 You're Done!

Your task tracking application is ready to use. Enjoy! 🚀
