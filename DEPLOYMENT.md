# Sudoku Battle - Deployment Guide

This guide explains how to deploy both the client and server components of Sudoku Battle to Plus Hosting or any other hosting provider.

## Prerequisites

- Node.js 18+ and npm installed on hosting server
- Access to your hosting control panel (cPanel, DirectAdmin, or SSH)
- Domain configured (e.g., kresimirnovak.eu)
- SSL certificate (Let's Encrypt available via cPanel)

## Pre-Configured URLs

The application is already configured for these production URLs:
- **Client (Game)**: `https://sudoku-battle.kresimirnovak.eu`
- **Server (API)**: Will need to be configured based on Plus Hosting setup

**If you want different URLs**, you'll need to update:
1. `client/.env.production` - Set `VITE_SERVER_URL`
2. `server/src/index.ts` line 18 - Update CORS origin

## Project Structure

```
multiplayer-sudoku/
├── client/          # Vue.js frontend
│   └── dist/        # Built static files (after npm run build)
├── server/          # Node.js backend
│   └── dist/        # Compiled JavaScript (after npm run build)
└── shared/          # Shared TypeScript types
```

## Part 1: Build for Production

### 1.1 Build the Client

```bash
cd client
npm install
npm run build
```

This creates `client/dist/` with:
- `index.html` - Main HTML file
- `assets/` - JavaScript, CSS, and images

### 1.2 Build the Server

```bash
cd ../server
npm install
npm run build
```

This creates `server/dist/` with compiled JavaScript files.

## Part 2: Deploy to Plus Hosting

### Option A: Deploy via cPanel File Manager

#### Step 1: Upload Client (Frontend)

1. Log into your Plus Hosting cPanel
2. Navigate to **File Manager**
3. Go to `public_html/` (or create a subdirectory like `public_html/sudoku-battle/`)
4. Upload all files from `client/dist/`:
   - `index.html`
   - `assets/` folder
5. Set file permissions to 644 for files, 755 for directories

#### Step 2: Upload Server (Backend)

1. Create a directory outside `public_html/` (for security):
   ```
   /home/yourusername/sudoku-server/
   ```

2. Upload these files/folders to `sudoku-server/`:
   - `server/dist/` → Upload entire folder
   - `server/package.json`
   - `server/node_modules/` → Upload or install via SSH
   - `shared/` → Upload the shared types folder

3. Alternative: Upload and install dependencies via SSH:
   ```bash
   cd /home/yourusername/sudoku-server
   npm install --production
   ```

#### Step 3: Configure Client to Point to Server

**IMPORTANT**: Configure the production server URL BEFORE building the client.

Create `client/.env.production` file:
```env
VITE_SERVER_URL=https://api.kresimirnovak.eu
```

Or if using a specific port:
```env
VITE_SERVER_URL=https://api.kresimirnovak.eu:3000
```

The client code already reads this variable from `client/src/composables/useSocket.ts`:
```typescript
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
```

Then rebuild:
```bash
cd client
npm run build
```

**Note**: The `.env.production` file is automatically used during production builds. Never edit the built JavaScript files directly.

#### Step 4: Start the Server

Plus Hosting typically uses Node.js app manager or PM2. Configure:

**Via cPanel Node.js Selector:**
1. Go to **Setup Node.js App**
2. Click **Create Application**
3. Set:
   - Node.js version: 18.x or higher
   - Application mode: Production
   - Application root: `/home/yourusername/sudoku-server`
   - Application URL: `api.kresimirnovak.eu` (create subdomain first)
   - Application startup file: `dist/server/src/index.js`
   - Environment variables:
     - `PORT=3000` (or port assigned by hosting)

4. Click **Create**
5. Click **Run NPM Install** if dependencies aren't installed
6. Click **Start**

**Via SSH with PM2:**
```bash
# Install PM2 globally
npm install -g pm2

# Start server
cd /home/yourusername/sudoku-server
pm2 start dist/server/src/index.js --name sudoku-server

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option B: Deploy via SSH (Recommended)

#### Step 1: Connect via SSH

```bash
ssh yourusername@kresimirnovak.eu
```

#### Step 2: Clone Repository (if using Git)

```bash
cd /home/yourusername
git clone https://github.com/yourusername/multiplayer-sudoku.git
cd multiplayer-sudoku
```

Or upload via SCP:
```bash
# From your local machine
scp -r multiplayer-sudoku yourusername@kresimirnovak.eu:/home/yourusername/
```

#### Step 3: Build and Install

```bash
# Build client
cd client
npm install
npm run build

# Build server
cd ../server
npm install
npm run build
```

#### Step 4: Deploy Client

```bash
# Copy client build to public directory
cp -r client/dist/* /home/yourusername/public_html/sudoku-battle/
```

#### Step 5: Start Server with PM2

```bash
cd /home/yourusername/multiplayer-sudoku/server
pm2 start dist/server/src/index.js --name sudoku-server
pm2 save
```

## Part 3: Configure Domain and Subdomain

### Create Subdomain for API

1. In cPanel, go to **Subdomains**
2. Create: `api.kresimirnovak.eu`
3. Point document root to `/home/yourusername/sudoku-server` (or leave default)

### Configure Reverse Proxy

Add to `.htaccess` in subdomain root:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

Or configure via cPanel **Proxy** settings:
- External domain: `api.kresimirnovak.eu`
- Proxy to: `http://localhost:3000`

### Enable HTTPS

1. In cPanel, go to **SSL/TLS Status**
2. Enable AutoSSL for both:
   - `kresimirnovak.eu`
   - `api.kresimirnovak.eu`

3. Update client to use HTTPS:
   ```typescript
   const SERVER_URL = 'https://api.kresimirnovak.eu'
   ```

## Part 4: Configure CORS on Server

The server is **already configured** for CORS with the production URL.

Current configuration in `server/src/index.ts`:
```typescript
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://192.168.0.178:5173',
    'https://sudoku-battle.kresimirnovak.eu'  // Production
  ],
  methods: ['GET', 'POST'],
  credentials: true
};
```

**If you use a different subdomain**, update line 18 in `server/src/index.ts`:
```typescript
'https://your-actual-subdomain.kresimirnovak.eu'
```

Then rebuild and restart:
```bash
cd server
npm run build
pm2 restart sudoku-server
```

## Part 5: Verify Deployment

### Test Client

1. Visit: `https://kresimirnovak.eu/sudoku-battle/`
2. Check browser console for errors (F12)
3. Verify the splash screen loads

### Test Server

```bash
# Check if server is running
pm2 status

# View server logs
pm2 logs sudoku-server

# Test endpoint
curl https://api.kresimirnovak.eu/
```

### Test Socket Connection

1. Open the game in two different browsers/tabs
2. Create a room in one
3. Join with the room code in the other
4. Verify both players appear
5. Play a few moves to test real-time sync

## Part 6: Maintenance

### Update the Application

```bash
# Pull latest code
git pull origin main

# Rebuild client
cd client
npm install
npm run build
cp -r dist/* /home/yourusername/public_html/sudoku-battle/

# Rebuild and restart server
cd ../server
npm install
npm run build
pm2 restart sudoku-server
```

### Monitor Server

```bash
# View logs
pm2 logs sudoku-server

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart sudoku-server
```

### Server Commands

```bash
# Start server
cd /home/yourusername/multiplayer-sudoku/server
npm start

# With PM2
pm2 start dist/server/src/index.js --name sudoku-server
pm2 stop sudoku-server
pm2 restart sudoku-server
pm2 delete sudoku-server
```

## Troubleshooting

### Client Can't Connect to Server

1. Check server is running: `pm2 status`
2. Verify SERVER_URL in client code points to correct domain
3. Check CORS configuration in server
4. Verify firewall/port 3000 is open (or using proxy)
5. Check browser console for CORS errors

### Server Won't Start

1. Check Node.js version: `node --version` (need 18+)
2. Verify all dependencies installed: `npm install`
3. Check file permissions: `chmod -R 755 server/dist/`
4. View error logs: `pm2 logs sudoku-server`
5. Try starting manually: `node dist/server/src/index.js`

### 502 Bad Gateway

1. Server may not be running - check `pm2 status`
2. Proxy configuration incorrect - verify `.htaccess`
3. Port not accessible - check firewall settings

### SSL Certificate Issues

1. Ensure AutoSSL is enabled for your domain
2. Force HTTPS redirect in `.htaccess`:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

## Quick Reference

### File Locations
- Client: `/home/yourusername/public_html/sudoku-battle/`
- Server: `/home/yourusername/multiplayer-sudoku/server/`
- Logs: `~/.pm2/logs/`

### Key URLs
- Game: `https://kresimirnovak.eu/sudoku-battle/`
- API: `https://api.kresimirnovak.eu`

### Important Commands
```bash
# Build
cd client && npm run build
cd server && npm run build

# Deploy
pm2 restart sudoku-server

# Debug
pm2 logs sudoku-server
pm2 monit
```

## Environment-Specific Configuration

### Development
- Client: `http://localhost:5173`
- Server: `http://localhost:3000`

### Production
- Client: `https://kresimirnovak.eu/sudoku-battle/`
- Server: `https://api.kresimirnovak.eu`

## Port Configuration

If Plus Hosting assigns a different port, update:

1. **In cPanel Node.js app settings**: Change application port
2. **In server code** (optional - reads from PORT env var):
   ```typescript
   const PORT = process.env.PORT || 3000
   ```
3. **In proxy config**: Update proxy destination port

## Environment Variables Reference

### Client Variables

Create `client/.env.production`:
```env
# Required: Your production server URL
VITE_SERVER_URL=https://api.kresimirnovak.eu

# Or with specific port if not using proxy
VITE_SERVER_URL=https://api.kresimirnovak.eu:3000
```

**Note**: This must be created BEFORE running `npm run build`

### Server Variables

Create `server/.env` (optional):
```env
# Port for the server (optional, defaults to 3000)
PORT=3000

# Environment mode
NODE_ENV=production
```

The server reads `PORT` from environment variables automatically:
```typescript
const PORT = process.env.PORT || 3000
```

## WebSocket Support

**CRITICAL**: Verify that Plus Hosting supports WebSocket connections. Socket.IO requires WebSocket protocol for real-time communication.

If WebSockets are not supported:
1. Contact Plus Hosting support to enable WebSocket
2. Or consider using a different hosting provider for the server (e.g., Railway, Render, DigitalOcean)
3. Keep the client on Plus Hosting, server elsewhere

## Next Steps After Deployment

1. Create subdomain `sudoku-battle.kresimirnovak.eu` in cPanel
2. Upload client build to the subdomain directory
3. Enable SSL for the subdomain
4. Set up Node.js application for server
5. Create API subdomain or configure reverse proxy
6. Test the connection between client and server
7. Play a test game with two different browsers/devices
