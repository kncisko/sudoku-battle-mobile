# Quick Start - Supabase Integration

## ✅ What's Been Implemented

I've successfully integrated Supabase with your Sudoku Battle game! Here's what's ready:

### Features
- 🔐 **Passwordless Authentication** - Email + 6-digit code (no passwords!)
- 👤 **User Profiles** - Customizable usernames and stats
- 🏆 **Leaderboard** - Real-time rankings of top players
- 📊 **PvP Game Tracking** - Automatic recording of multiplayer games
- 🤖 **AI Game Exclusion** - Practice games NOT tracked (as requested)

### UI Components Added
- **Sign In Button** - Top-left corner when not logged in
- **Profile Icon** - Top-left after sign in (shows stats dropdown)
- **Leaderboard Trophy** - Top-left to view rankings
- **Auth Modal** - Email input → OTP verification
- **User Profile Card** - Stats and username editing

## 🚀 Next Steps to Enable This Feature

### 1. Create Supabase Account & Project

```bash
# Go to: https://supabase.com
# Sign up (free tier is perfect)
# Click "New Project"
# Choose a name, region, and password
# Wait ~2 minutes for setup
```

### 2. Get Your API Credentials

In Supabase Dashboard:
1. Go to **Project Settings** (gear icon)
2. Click **API** in left menu
3. Copy these two values:
   - `Project URL`
   - `anon public` key

### 3. Set Up Database

1. Go to **SQL Editor** in Supabase dashboard
2. Click "New query"
3. Open `SUPABASE_SCHEMA.sql` from project root
4. Copy entire contents and paste into SQL editor
5. Click "Run" button
6. Verify success messages appear

### 4. Configure Environment Variables

#### For Development:

Create `/client/.env`:
```env
VITE_SERVER_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Create `/server/.env`:
```env
PORT=3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find service_role_key:**
- Same place as anon key
- Look under "Project API keys" → "service_role"
- ⚠️ Keep this SECRET - never expose in client!

#### For Production:

Update `/client/.env.production`:
```env
VITE_SERVER_URL=https://sudoku-battle-be.kresimirnovak.eu
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Add to your server hosting environment:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 5. Test Locally

```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev

# Open browser to localhost:5174
# Click "Sign In"
# Enter your email
# Check email for 6-digit code
# Enter code and verify it works!
```

### 6. Deploy to Production

```bash
# Build client
cd client
npm run build

# Upload dist/ folder to hosting

# Build server
cd server
npm run build

# Deploy with environment variables
# Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set!
```

## 📖 Full Documentation

- **`SUPABASE_SETUP_GUIDE.md`** - Detailed step-by-step guide
- **`SUPABASE_SCHEMA.sql`** - Database schema to run
- **`SUPABASE_IMPLEMENTATION_SUMMARY.md`** - Technical details

## 🎮 How It Works

### Player Experience

1. **Sign In** (optional)
   - Click "Sign In" button
   - Enter email
   - Receive 6-digit code
   - Enter code → Signed in!

2. **Play Games**
   - **PvP Games** → Automatically tracked if both players authenticated
   - **AI Games** → NOT tracked (practice mode)
   - **Offline Games** → NOT tracked (no server connection)

3. **View Stats**
   - Click profile icon (top-left)
   - See wins, losses, games played, win rate
   - Edit username

4. **Check Leaderboard**
   - Click trophy icon (top-left)
   - See top 50 players
   - Your position highlighted

### What Gets Tracked

✅ **Tracked in Database:**
- Player vs Player multiplayer games
- Both players must be authenticated
- Winner, scores, game duration, early wins

❌ **NOT Tracked:**
- AI games (practice only)
- Offline games (no server)
- Games where one/both players not signed in

## 🔧 Troubleshooting

### "Failed to send magic link"
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env
- Verify email provider is enabled in Supabase dashboard

### "Leaderboard is empty"
- Play some PvP games while authenticated
- Both players must be signed in for game to be tracked

### "Email not arriving"
- Check spam folder
- Verify email address is correct
- Check Supabase email quota (free tier has limits)
- View logs in Supabase: **Authentication** > **Logs**

### Server says "Supabase not configured"
- Check server/.env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- Restart server after adding environment variables
- Games will still work, just won't be tracked

## 💡 Tips

1. **Free Tier is Enough**
   - 50,000 monthly active users
   - 500MB database
   - 1GB file storage
   - Perfect for your use case!

2. **Email Customization**
   - Customize email templates in Supabase dashboard
   - Add your branding and messaging
   - Under **Authentication** > **Email Templates**

3. **Monitor Usage**
   - Check Supabase dashboard for stats
   - View **Database** > **Table Editor** to see game results
   - Monitor **Authentication** > **Users** for sign-ups

4. **Test Before Deploy**
   - Always test locally first
   - Verify email delivery
   - Check database entries
   - Test leaderboard updates

## ✨ That's It!

The code is ready to go. Just need to:
1. Create Supabase project
2. Run the SQL schema
3. Add environment variables
4. Test and deploy!

Questions? Check the detailed guides in the docs folder.
