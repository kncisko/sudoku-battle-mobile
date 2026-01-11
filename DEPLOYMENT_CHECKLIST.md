# Sudoku Battle - Deployment Checklist

Quick step-by-step checklist for deploying to kresimirnovak.eu with Plus Hosting.

## Pre-Configured URLs ✓

- **Client**: `https://sudoku-battle.kresimirnovak.eu`
- **Server**: `https://sudoku-battle-be.kresimirnovak.eu`
- **CORS**: Already configured ✓
- **Environment files**: Already configured ✓

## Before You Start

- [ ] Verify Plus Hosting supports Node.js 18+
- [ ] Verify Plus Hosting supports WebSocket connections (CRITICAL for Socket.IO)
- [ ] Have cPanel login credentials ready
- [ ] Have FTP/SFTP credentials ready (if needed)

## Part 1: Build the Application

### 1.1 Build Client
```bash
cd client
npm install
npm run build
```
- [ ] Build completes successfully
- [ ] `client/dist/` folder created
- [ ] `client/dist/index.html` exists
- [ ] `client/dist/assets/` folder contains JS, CSS, and images

### 1.2 Build Server
```bash
cd ../server
npm install
npm run build
```
- [ ] Build completes successfully
- [ ] `server/dist/` folder created
- [ ] `server/dist/server/src/index.js` exists

## Part 2: Deploy Client (Frontend)

### 2.1 Create Subdomain in cPanel
- [ ] Log into Plus Hosting cPanel
- [ ] Go to **Subdomains**
- [ ] Create subdomain: `sudoku-battle`
- [ ] Note the document root path (e.g., `/public_html/sudoku-battle/`)

### 2.2 Upload Client Files
- [ ] Open **File Manager** in cPanel
- [ ] Navigate to subdomain directory
- [ ] Upload ALL contents of `client/dist/`:
  - [ ] `index.html`
  - [ ] `assets/` folder (with all files inside)
- [ ] Verify file structure:
  ```
  /public_html/sudoku-battle/
  ├── index.html
  └── assets/
      ├── FullSplash-*.png
      ├── index-*.js
      └── index-*.css
  ```

### 2.3 Enable SSL for Client
- [ ] Go to **SSL/TLS Status** in cPanel
- [ ] Enable AutoSSL for `sudoku-battle.kresimirnovak.eu`
- [ ] Wait for certificate to activate (usually < 5 minutes)
- [ ] Test: Visit `https://sudoku-battle.kresimirnovak.eu` (should load, may not connect to server yet)

## Part 3: Deploy Server (Backend)

### 3.1 Create Backend Subdomain
- [ ] Go to **Subdomains** in cPanel
- [ ] Create subdomain: `sudoku-battle-be`
- [ ] Note the document root path

### 3.2 Upload Server Files

**Option A - Via cPanel File Manager:**
- [ ] Create directory: `/home/yourusername/sudoku-server/` (outside public_html for security)
- [ ] Upload to this directory:
  - [ ] `server/dist/` folder (entire folder with contents)
  - [ ] `server/package.json`
  - [ ] `server/package-lock.json`
  - [ ] `shared/` folder (from project root)

**Option B - Via SSH (if available):**
```bash
# Upload via SCP
scp -r server/dist server/package.json server/package-lock.json ../shared yourusername@kresimirnovak.eu:/home/yourusername/sudoku-server/
```

### 3.3 Install Server Dependencies

**Via cPanel Terminal or SSH:**
```bash
cd /home/yourusername/sudoku-server
npm install --production
```
- [ ] Dependencies installed successfully
- [ ] No error messages

### 3.4 Configure Node.js Application

**Via cPanel Node.js Selector:**
- [ ] Go to **Setup Node.js App**
- [ ] Click **Create Application**
- [ ] Configure:
  - **Node.js version**: 18.x or newer
  - **Application mode**: Production
  - **Application root**: `/home/yourusername/sudoku-server`
  - **Application URL**: `sudoku-battle-be.kresimirnovak.eu`
  - **Application startup file**: `dist/server/src/index.js`
  - **Environment variables**:
    - `PORT=3000` (or assigned port)
    - `NODE_ENV=production`
- [ ] Click **Create**
- [ ] Click **Start** to start the application
- [ ] Verify status shows "Running"

**Alternative - Via PM2 (if SSH available):**
```bash
npm install -g pm2
cd /home/yourusername/sudoku-server
pm2 start dist/server/src/index.js --name sudoku-server
pm2 save
pm2 startup
```

### 3.5 Enable SSL for Server
- [ ] Go to **SSL/TLS Status** in cPanel
- [ ] Enable AutoSSL for `sudoku-battle-be.kresimirnovak.eu`
- [ ] Wait for certificate to activate

### 3.6 Configure WebSocket Proxy (if needed)

If server is not directly accessible, configure reverse proxy in subdomain `.htaccess`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# WebSocket support
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^(.*)$ ws://localhost:3000/$1 [P,L]

# Regular HTTP
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

- [ ] Create/edit `.htaccess` in `/public_html/sudoku-battle-be/`
- [ ] Add proxy configuration above
- [ ] Save file

## Part 4: Testing

### 4.1 Test Server
```bash
# Via SSH or cPanel Terminal
curl http://localhost:3000
```
- [ ] Server responds (should see some response)
- [ ] No connection errors

Test from outside:
```bash
curl https://sudoku-battle-be.kresimirnovak.eu
```
- [ ] Server accessible from internet

### 4.2 Test Client
- [ ] Visit `https://sudoku-battle.kresimirnovak.eu`
- [ ] Splash screen appears
- [ ] No JavaScript errors in browser console (F12)
- [ ] See connection status indicator

### 4.3 Test WebSocket Connection
- [ ] Open browser DevTools (F12) → Console
- [ ] Look for message: `🔌 Socket.IO connecting to: https://sudoku-battle-be.kresimirnovak.eu`
- [ ] Verify connection successful (check for Socket.IO handshake in Network tab)
- [ ] Status should show "Connected" or similar

### 4.4 Test Full Game Flow
- [ ] **Browser 1**: Click "Create Game"
- [ ] **Browser 1**: Copy room code
- [ ] **Browser 2**: Open `https://sudoku-battle.kresimirnovak.eu` in different browser/device
- [ ] **Browser 2**: Click "Join Game" and enter room code
- [ ] **Both**: Verify both players appear on screen
- [ ] **Both**: Verify player colors are different
- [ ] **Both**: Click "Start Game"
- [ ] **Both**: Verify Sudoku board appears
- [ ] **Player 1**: Make a move (click cell, select number)
- [ ] **Both**: Verify turn switches to Player 2
- [ ] **Both**: Verify timer appears and counts down
- [ ] **Player 2**: Make a move
- [ ] **Both**: Verify move appears on both screens immediately
- [ ] Play a few more moves to confirm sync
- [ ] Complete the game and verify winner is shown

## Part 5: Monitoring

### Check Server Status
**Via cPanel:**
- [ ] Go to **Setup Node.js App**
- [ ] Check application status

**Via PM2 (if using):**
```bash
pm2 status
pm2 logs sudoku-server
```

### View Logs
- [ ] Check cPanel error logs
- [ ] Check Node.js application logs
- [ ] Monitor for errors during gameplay

## Troubleshooting

### Client loads but won't connect to server
- [ ] Check server is running (cPanel or PM2 status)
- [ ] Verify `.env.production` has correct server URL
- [ ] Check browser console for CORS errors
- [ ] Verify SSL enabled on both domains

### WebSocket connection fails
- [ ] Contact Plus Hosting to confirm WebSocket support
- [ ] Check proxy configuration in `.htaccess`
- [ ] Verify firewall isn't blocking WebSocket
- [ ] Check browser console for specific error messages

### 502 Bad Gateway
- [ ] Server may have crashed - check logs
- [ ] Restart server via cPanel or PM2
- [ ] Check port configuration

### Game doesn't sync between players
- [ ] Check WebSocket connection in both browsers
- [ ] Verify both clients connected to same server
- [ ] Check server logs for errors
- [ ] Verify room codes match

## Success Criteria ✓

- [ ] Client accessible at `https://sudoku-battle.kresimirnovak.eu`
- [ ] Server running at `https://sudoku-battle-be.kresimirnovak.eu`
- [ ] SSL certificates active on both domains
- [ ] Two players can create and join a room
- [ ] WebSocket connection established (visible in DevTools)
- [ ] Moves sync in real-time between players
- [ ] Timer works and synchronizes
- [ ] Game completes and shows winner
- [ ] No errors in browser console or server logs

## Post-Deployment

- [ ] Test on mobile devices
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Monitor server performance
- [ ] Set up automated backups (via cPanel)
- [ ] Document any Plus Hosting specific configurations
- [ ] Share game link with friends to test!

## Need Help?

**Plus Hosting Support Questions:**
- "Does my hosting plan support WebSocket connections?"
- "How do I configure a Node.js application to run continuously?"
- "What ports are available for my Node.js application?"
- "How do I configure reverse proxy for WebSocket?"

**Check Documentation:**
- See `DEPLOYMENT.md` for detailed instructions
- See `README.md` for local development setup

---

**Note**: After successful deployment, you can play Sudoku Battle with anyone by sharing the URL: `https://sudoku-battle.kresimirnovak.eu`
