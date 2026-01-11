# Simple Deployment Guide for Sudoku Battle

Your setup:
- **Client (Frontend)**: `sudoku-battle.kresimirnovak.eu`
- **Server (Backend)**: `sudoku-battle-be.kresimirnovak.eu`

---

## STEP 1: Configure the Client to Use Your Backend URL

Before building, update the server URL to point to your backend subdomain.

**Edit this file:** `client/src/composables/useSocket.ts`

**Find line 5:**
```typescript
const SERVER_URL = 'http://localhost:3000'
```

**Replace with:**
```typescript
const SERVER_URL = 'https://sudoku-battle-be.kresimirnovak.eu'
```

**Save the file.**

---

## STEP 2: Build the Client

Open terminal in your project root:

```bash
cd client
npm install
npm run build
```

This creates the `client/dist/` folder with your static files.

---

## STEP 3: Upload Client Files

### Via cPanel File Manager:

1. Log into Plus Hosting cPanel
2. Open **File Manager**
3. Find the folder for `sudoku-battle.kresimirnovak.eu`
   - Usually: `public_html/sudoku-battle.kresimirnovak.eu/` or similar
4. **Delete** everything in that folder (if anything exists)
5. **Upload** everything from your local `client/dist/` folder:
   - `index.html`
   - `assets/` folder (with all files inside)
6. Make sure the structure looks like:
   ```
   public_html/sudoku-battle.kresimirnovak.eu/
   ├── index.html
   └── assets/
       ├── index-xxxxx.js
       ├── index-xxxxx.css
       └── FullSplash-xxxxx.png
   ```

### Via FTP/SFTP (FileZilla):

1. Connect to your hosting via FTP
2. Navigate to the subdomain folder
3. Upload all files from `client/dist/`

**Test:** Visit `https://sudoku-battle.kresimirnovak.eu` - you should see the splash screen (but it won't work yet until server is running).

---

## STEP 4: Build the Server

Back in your local terminal:

```bash
cd ../server
npm install
npm run build
```

This creates the `server/dist/` folder.

---

## STEP 5: Prepare Server Files for Upload

Create a folder on your computer with these files from the server:

**Create a folder called `sudoku-server-upload/` and copy these into it:**

From `server/` folder:
- ✅ `package.json`
- ✅ `dist/` folder (entire folder with all contents)

From project root:
- ✅ `shared/` folder (entire folder)

Your `sudoku-server-upload/` folder should look like:
```
sudoku-server-upload/
├── package.json
├── dist/
│   ├── server/
│   └── shared/
└── shared/
    └── types.ts
```

---

## STEP 6: Upload Server Files

### Where to upload?

**Find your backend subdomain folder in cPanel:**
- Usually: `public_html/sudoku-battle-be.kresimirnovak.eu/` or `/home/yourusername/sudoku-battle-be.kresimirnovak.eu/`

### Upload:

1. Go to **cPanel → File Manager**
2. Navigate to the backend subdomain folder
3. **Upload everything** from your `sudoku-server-upload/` folder
4. The structure should be:
   ```
   .../sudoku-battle-be.kresimirnovak.eu/
   ├── package.json
   ├── dist/
   │   ├── server/
   │   └── shared/
   └── shared/
       └── types.ts
   ```

---

## STEP 7: Install Server Dependencies

You need SSH access for this. If you don't have SSH, ask Plus Hosting support to enable it.

### Connect via SSH:

```bash
ssh yourusername@kresimirnovak.eu
```

Replace `yourusername` with your actual Plus Hosting username.

### Navigate to server folder:

```bash
cd public_html/sudoku-battle-be.kresimirnovak.eu
# Or wherever your backend folder is located
```

### Install dependencies:

```bash
npm install --production
```

This will create the `node_modules/` folder with all required packages.

---

## STEP 8: Start the Server

### Option A: Using Node.js Selector in cPanel (Recommended)

1. Go to **cPanel → Setup Node.js App** (or "Node.js Selector")
2. Click **Create Application**
3. Fill in:
   - **Node.js version**: Select 18.x or newer
   - **Application mode**: Production
   - **Application root**: `/home/yourusername/public_html/sudoku-battle-be.kresimirnovak.eu`
     (adjust path if different)
   - **Application URL**: Leave as `sudoku-battle-be.kresimirnovak.eu`
   - **Application startup file**: `dist/server/src/index.js`
   - **Environment variables** (click "Add Variable"):
     - Name: `PORT`, Value: `3000` (or use the port cPanel assigns)
4. Click **Create**
5. If it says "Run NPM Install" - click that button
6. Click **Start** or **Restart**
7. Check status - should say "Running"

### Option B: Using PM2 via SSH (If cPanel option not available)

First, install PM2:
```bash
npm install -g pm2
```

Start the server:
```bash
pm2 start dist/server/src/index.js --name sudoku-server
```

Check status:
```bash
pm2 status
```

Save PM2 configuration (so it starts on reboot):
```bash
pm2 save
pm2 startup
```

---

## STEP 9: Configure Reverse Proxy

The server runs on a port (e.g., 3000), but you want it accessible at `https://sudoku-battle-be.kresimirnovak.eu`.

### Create .htaccess file:

1. In **File Manager**, go to your backend subdomain folder
2. Create a new file called `.htaccess` (note the dot at the start)
3. Add this content:

```apache
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Proxy all requests to Node.js server
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

4. **Save the file**

**Important:** Replace `3000` with whatever port your server is actually using (check cPanel Node.js app settings).

---

## STEP 10: Enable HTTPS/SSL

1. Go to **cPanel → SSL/TLS Status**
2. Find both subdomains:
   - `sudoku-battle.kresimirnovak.eu`
   - `sudoku-battle-be.kresimirnovak.eu`
3. Click **Run AutoSSL** for both
4. Wait a few minutes for certificates to be issued

---

## STEP 11: Test Everything!

### Test Backend:

Open browser and visit:
```
https://sudoku-battle-be.kresimirnovak.eu
```

You should see something or a blank page (that's okay - the server responds to Socket.IO connections, not HTTP GET).

Check if Socket.IO is working - open browser console (F12) and run:
```javascript
fetch('https://sudoku-battle-be.kresimirnovak.eu/socket.io/')
  .then(r => r.text())
  .then(console.log)
```

Should see some Socket.IO response (not an error).

### Test Frontend:

1. Open: `https://sudoku-battle.kresimirnovak.eu`
2. You should see the splash screen
3. Click "START" to enter the game

### Test Full Game:

1. Open the game in **two different browsers** (Chrome and Firefox) or two incognito windows
2. In Browser 1: Click "Create New Room"
3. Copy the 6-character room code
4. In Browser 2: Enter your name and paste the room code, click "Join Room"
5. Both players should appear in the lobby
6. Game should start automatically
7. Try making moves - they should sync in real-time!

---

## Troubleshooting

### Client loads but says "Failed to connect to server"

**Check:**
1. Is server running?
   ```bash
   ssh yourusername@kresimirnovak.eu
   pm2 status
   # or check cPanel Node.js app status
   ```

2. View server logs:
   ```bash
   pm2 logs sudoku-server
   # or check cPanel application logs
   ```

3. Open browser console (F12) on client page - look for errors

### Server won't start

**Check Node.js version:**
```bash
node --version
```
Should be v18 or higher. If not, use cPanel Node.js Selector to change it.

**Check for errors:**
```bash
cd /path/to/backend/folder
node dist/server/src/index.js
```
Read any error messages.

### CORS errors in browser console

The server already has CORS configured for all origins (`*`), but if you see CORS errors:

1. SSH into server
2. Edit: `dist/server/src/index.js`
3. Find the CORS section and ensure it has:
   ```javascript
   app.use(cors({ origin: '*' }))
   ```
4. Restart server:
   ```bash
   pm2 restart sudoku-server
   # or restart via cPanel
   ```

### Wrong port

If `.htaccess` proxy isn't working, check what port the server is running on:

```bash
# View server logs
pm2 logs sudoku-server
```

Look for: `🚀 Server running on http://localhost:XXXX`

Update `.htaccess` to use that port number.

---

## Quick Commands Reference

### Via SSH:

```bash
# Connect
ssh yourusername@kresimirnovak.eu

# Navigate to server
cd public_html/sudoku-battle-be.kresimirnovak.eu

# Check PM2 status
pm2 status

# View logs
pm2 logs sudoku-server

# Restart server
pm2 restart sudoku-server

# Stop server
pm2 stop sudoku-server

# Start server (if stopped)
pm2 start dist/server/src/index.js --name sudoku-server
```

### File Locations:

- **Frontend**: `public_html/sudoku-battle.kresimirnovak.eu/`
- **Backend**: `public_html/sudoku-battle-be.kresimirnovak.eu/`

### URLs:

- **Play game**: https://sudoku-battle.kresimirnovak.eu
- **Backend API**: https://sudoku-battle-be.kresimirnovak.eu

---

## Need to Update After Code Changes?

### Update Client:

```bash
# On your local machine
cd client
npm run build

# Upload new files from client/dist/ to:
# public_html/sudoku-battle.kresimirnovak.eu/
```

### Update Server:

```bash
# On your local machine
cd server
npm run build

# Upload new files from server/dist/ to:
# public_html/sudoku-battle-be.kresimirnovak.eu/dist/

# Then restart via SSH:
pm2 restart sudoku-server
```

---

That's it! Follow these steps in order and your game should be live. If you get stuck at any step, let me know exactly where and what error you're seeing.
