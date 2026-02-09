# 🚀 Task Logger V2 - Complete Setup Guide

## ✨ NEW FEATURES

### 1. **User Signup** ✅
- Create new accounts
- Email field (optional)
- Username validation

### 2. **Password Reset** ✅
- Request reset code
- 6-digit reset code (15 min expiry)
- Reset password with code

### 3. **Platform Column** ✅
- New required field in tasks
- Options: Oscar, OscarLite, REVCDI, RevCode, Curate
- Filterable and exportable

### 4. **Updated Teams** ✅
- Build, Imp, Adhoc (kept)
- Support, Internal (added)
- Oscar Lite (removed)

---

## 📋 DEPLOYMENT STEPS

### STEP 1: Drop Old Tables in Neon (IMPORTANT)

1. Go to: **https://console.neon.tech**
2. Click "SQL Editor"
3. Run this:

```sql
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

This removes old tables so new schema can be created.

### STEP 2: Push to GitHub

```bash
cd task-logger
git add .
git commit -m "v2: Added signup, password reset, platform column"
git push origin main
```

### STEP 3: Redeploy in Render

1. Go to: **https://dashboard.render.com**
2. Click your service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait 3-4 minutes

### STEP 4: Watch Logs

You should see:
```
✅ Database connected successfully
✅ Users table ready
✅ Created default user: Venkatakamesh
✅ Created default user: Chandrashekar
✅ Created default user: Meenu
✅ Tasks table ready
DATABASE READY ✅
🚀 SERVER STARTED SUCCESSFULLY
```

---

## 👤 USER MANAGEMENT

### Default Users (Pre-created):
- Venkatakamesh / Venkatakamesh
- Chandrashekar / Chandrashekar
- Meenu / Meenu

### Create New Users:
1. Open your app
2. Click "Create Account"
3. Enter username (min 3 chars)
4. Enter password (min 3 chars)
5. Optional: Enter email
6. Click "Create Account"
7. Login with new credentials

---

## 🔑 PASSWORD RESET FLOW

### To Reset Password:

1. **On login page**, click "Forgot Password?"
2. **Enter username**
3. Click "Get Reset Code"
4. **Reset code appears** (6-digit code like: ABC123)
5. **Copy the code**
6. **Enter reset code** and **new password**
7. Click "Reset Password"
8. **Login** with new password

**Note:** Reset codes expire in 15 minutes.

---

## 📊 NEW TASK FIELDS

### Required Fields:
1. Task (text)
2. Client (dropdown - 15 options)
3. **Platform (dropdown - NEW)** ⭐
   - Oscar
   - OscarLite
   - REVCDI
   - RevCode
   - Curate
4. Team (dropdown - 5 options)
   - Build
   - Imp
   - Adhoc
   - Support ⭐ NEW
   - Internal ⭐ NEW
5. User (auto-filled)
6. Hours & Minutes
7. Start/End Dates
8. Status

---

## 🔍 FILTERS

All columns are filterable:
- Task (search)
- Client (dropdown)
- **Platform (dropdown)** ⭐ NEW
- Team (dropdown - updated options)
- User (dropdown)
- Hours (search)
- Start Date (date picker)
- End Date (date picker)
- Status (dropdown)

---

## 📤 EXPORT TO EXCEL

CSV export includes:
- ID, Task, Client, **Platform** ⭐, Team, User
- Hours, Minutes, Total Time
- Start Date, End Date, Status
- Created At, Updated At (IST timezone)

---

## 🗄️ DATABASE STRUCTURE

### Users Table:
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tasks Table:
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    task TEXT NOT NULL,
    client TEXT NOT NULL,
    platform TEXT NOT NULL,  -- NEW COLUMN
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
```

---

## ✅ VERIFICATION CHECKLIST

After deployment:

### Login Page:
- [ ] Can access login page
- [ ] "Create Account" link works
- [ ] "Forgot Password?" link works

### Signup:
- [ ] Can create new account
- [ ] Gets "Account created successfully" message
- [ ] Can login with new account

### Password Reset:
- [ ] Can request reset code
- [ ] Reset code displayed
- [ ] Can reset password with code
- [ ] Can login with new password

### Tasks:
- [ ] Can add task with platform field
- [ ] Platform dropdown has 5 options
- [ ] Team dropdown has 5 options (Build, Imp, Adhoc, Support, Internal)
- [ ] Task appears in list
- [ ] Platform column shows in table
- [ ] Can filter by platform
- [ ] Can edit task (platform editable)
- [ ] Export includes platform

---

## 🧪 TESTING PROCEDURE

### Test 1: Signup & Login
```
1. Click "Create Account"
2. Username: TestUser
3. Password: test123
4. Click "Create Account"
5. Should see success message
6. Login with TestUser/test123
7. Should work ✅
```

### Test 2: Password Reset
```
1. Logout
2. Click "Forgot Password?"
3. Enter: Venkatakamesh
4. Click "Get Reset Code"
5. Note the 6-digit code
6. Enter code and new password
7. Click "Reset Password"
8. Login with new password
9. Should work ✅
```

### Test 3: Platform Field
```
1. Login
2. Add task
3. Client: Medstar
4. Platform: Oscar ⭐
5. Team: Build
6. Fill other fields
7. Click "Add Task"
8. Should see platform in list ✅
```

### Test 4: Team Options
```
1. Add task
2. Click Team dropdown
3. Should see: Build, Imp, Adhoc, Support, Internal ✅
4. Should NOT see: Oscar Lite ✅
```

---

## 🔧 TROUBLESHOOTING

### Issue: "column platform does not exist"

**Fix:**
```sql
-- In Neon SQL Editor:
DROP TABLE IF EXISTS tasks CASCADE;

-- Then redeploy in Render
-- App will recreate table with platform column
```

### Issue: Can't login with default users

**Fix:**
```sql
-- In Neon SQL Editor:
SELECT username FROM users;

-- If no users, redeploy in Render
-- App creates default users automatically
```

### Issue: Password reset code not working

**Check:**
- Code is case-sensitive (use UPPERCASE)
- Code expires in 15 minutes
- Username is correct

---

## 📊 PLATFORM OPTIONS

| Platform | Description |
|----------|-------------|
| Oscar | Main Oscar platform |
| OscarLite | Lite version of Oscar |
| REVCDI | Revenue CDI system |
| RevCode | Revenue coding system |
| Curate | Curate platform |

---

## 👥 TEAM OPTIONS

| Team | Description |
|------|-------------|
| Build | Development team |
| Imp | Implementation team |
| Adhoc | Ad-hoc tasks |
| Support | Support team ⭐ NEW |
| Internal | Internal projects ⭐ NEW |

---

## 🎯 QUICK COMMANDS

### Deploy:
```bash
git add .
git commit -m "Updated to v2"
git push origin main
```

### Reset Database:
```sql
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

### Check Users:
```sql
SELECT username, email, created_at FROM users;
```

### Check Tasks:
```sql
SELECT id, task, platform, team FROM tasks ORDER BY id DESC LIMIT 10;
```

---

## ✅ SUCCESS INDICATORS

Your v2 is working when:

- ✅ Can create new accounts
- ✅ Can reset passwords
- ✅ Platform field appears in form
- ✅ Platform column shows in table
- ✅ Team dropdown has 5 options
- ✅ Can filter by platform
- ✅ Export includes platform
- ✅ All existing features work

---

## 🎉 YOU'RE DONE!

Your Task Logger V2 now has:
- ✅ User signup
- ✅ Password reset
- ✅ Platform tracking
- ✅ Updated team options
- ✅ All previous features

**Enjoy your upgraded task logger!** 🚀
