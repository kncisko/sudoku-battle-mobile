# Deploy Server to Hetzner VPS

Build the server TypeScript and deploy to the Hetzner VPS, then restart PM2.

**Usage:** `/server-deploy`

## What This Command Does

- Builds the server TypeScript locally
- Uploads `dist/`, `package.json`, `package-lock.json` via Cyberduck instructions
- Restarts PM2 on the Hetzner server

## Steps Executed

1. **Build server**
   - Run `npm run build` in the `server/` directory
   - Compiles TypeScript to `dist/`

2. **Upload to server**
   - Instruct user to upload via Cyberduck to `/var/www/sudoku-battle/`:
     - `dist/` folder (replace existing)
     - `package.json`
     - `package-lock.json`

3. **Restart PM2**
   - Instruct user to run in SSH terminal:
     ```bash
     cd /var/www/sudoku-battle && npm install && pm2 restart ecosystem.config.cjs
     ```

4. **Verify**
   - Check server is running:
     ```bash
     pm2 list
     pm2 logs sudoku-battle --lines 20
     ```

## Implementation

Execute these steps:

### Step 1: Build server locally
```bash
cd /Users/kresimirnovak/projects/sudoku-battle-mobile/server && npm run build
```

### Step 2: Instruct user to upload via Cyberduck
Tell the user to connect to Hetzner server via Cyberduck (SFTP, IP: 178.104.141.81, user: root) and upload to `/var/www/sudoku-battle/`:
- `dist/` folder
- `package.json`
- `package-lock.json`

### Step 3: Instruct user to run in SSH
```bash
cd /var/www/sudoku-battle && npm install && pm2 restart ecosystem.config.cjs
```

### Step 4: Verify
Ask user to confirm with:
```bash
pm2 list
```

## Server Details

- **IP**: 178.104.141.81
- **User**: root
- **App directory**: `/var/www/sudoku-battle/`
- **Ecosystem file**: `ecosystem.config.cjs`
- **Process manager**: PM2
- **URL**: https://sudoku-battle-be.kresimirnovak.eu
