# Quick Update Guide

Now that your game is deployed, updating is simple!

---

## For CLIENT Changes (Frontend)

**1. Build locally:**
```bash
cd client
npm run build
```

**2. Upload via FileZilla:**
- Upload everything from `client/dist/` to `sudoku-battle.kresimirnovak.eu/`
- Overwrite existing files

**3. Done!** Refresh the game page.

---

## For SERVER Changes (Backend)

**1. Build locally:**
```bash
cd server
npm run build
```

**2. Upload via FileZilla:**
- Upload `server/dist/` folder to `sudoku-battle-be.kresimirnovak.eu/dist/`
- Overwrite existing files

**3. Restart the server:**
- Go to cPanel → Setup Node.js App
- Click **"RESTART"** button

**4. Done!** Server is updated.

---

## For SHARED Types Changes

If you modify `shared/types.ts`:

1. Rebuild **both** client and server (they both use shared types)
2. Upload both as described above
3. Restart the server

---

## Quick Checklist

**Client only changes** (UI, styles, client logic):
- ✅ Build client
- ✅ Upload client/dist/
- ✅ Refresh browser

**Server only changes** (game logic, Socket.IO):
- ✅ Build server
- ✅ Upload server/dist/
- ✅ Restart in cPanel

**Both changed**:
- ✅ Build both
- ✅ Upload both
- ✅ Restart server
- ✅ Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

---

## If Server Won't Start After Update

1. Check error logs via cPanel Terminal:
   ```bash
   cd ~/sudoku-battle-be.kresimirnovak.eu
   cat stderr.log
   ```

2. Common issues:
   - **Syntax error**: Check the error message, fix in your local code, rebuild, re-upload
   - **Missing module**: You probably added a new npm package - see below

---

## If You Add New NPM Packages

### Client:
```bash
cd client
npm install package-name
npm run build
```
Upload as normal. No extra steps needed.

### Server:
```bash
cd server
npm install package-name
npm run build
```

Upload, then **also update package.json on server**:
1. Upload `server/package.json` to `sudoku-battle-be.kresimirnovak.eu/`
2. Open cPanel Terminal:
   ```bash
   cd ~/sudoku-battle-be.kresimirnovak.eu
   source ~/nodevenv/sudoku-battle-be.kresimirnovak.eu/22/bin/activate
   npm install --omit=dev
   ```
3. Restart server in cPanel

---

## Pro Tips

- **Always test locally first** before deploying
- **Commit to git** before deploying (you already have clean repo)
- **Keep a backup** of working `dist/` folders just in case
- **FileZilla bookmark**: Save your connection for quick access

---

## File Locations Reference

### Local (your computer):
- Client source: `client/src/`
- Client build: `client/dist/`
- Server source: `server/src/`
- Server build: `server/dist/`

### Remote (Plus Hosting):
- Client: `sudoku-battle.kresimirnovak.eu/`
- Server: `sudoku-battle-be.kresimirnovak.eu/`
- Server node_modules: Managed by cPanel (symlinked)

---

That's it! Future updates should take less than 5 minutes. 🚀
