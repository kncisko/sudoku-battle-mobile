# Supabase Setup Guide for Sudoku Battle

This guide will walk you through setting up Supabase for user authentication and leaderboards in Sudoku Battle.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Your project deployed or running locally

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - **Name**: sudoku-battle (or your preferred name)
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (~2 minutes)

## Step 2: Get Your API Credentials

1. Go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. You'll need two values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 3: Configure Environment Variables

### Client (.env)

Create or update `/client/.env`:

```env
# Server URL for WebSocket connection
VITE_SERVER_URL=http://localhost:3000

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Production Client (.env.production)

Create or update `/client/.env.production`:

```env
# Production server URL
VITE_SERVER_URL=https://sudoku-battle-be.kresimirnovak.eu

# Supabase Configuration (same as dev)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Server (.env)

Create or update `/server/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Note**: The service role key is different from the anon key. Find it in **Project Settings > API > service_role**. ⚠️ **NEVER** expose this key in the client!

## Step 4: Set Up the Database Schema

1. Go to the **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy the entire contents of `SUPABASE_SCHEMA.sql` from the project root
4. Paste it into the SQL editor
5. Click "Run" to execute the SQL
6. You should see success messages for:
   - Creating `profiles` table
   - Creating `game_results` table
   - Creating `leaderboard` view
   - Setting up Row Level Security policies
   - Creating triggers

## Step 5: Configure Email Authentication

1. Go to **Authentication** > **Providers** in Supabase dashboard
2. Find "Email" provider
3. Make sure it's **enabled**
4. Configure email settings:
   - **Enable email confirmations**: OFF (we use OTP instead)
   - **Secure email change**: Recommended
5. Go to **Authentication** > **Email Templates**
6. Customize the "Magic Link" template if desired (optional)

### Email Template Customization (Optional)

The default template works fine, but you can customize it:

```html
<h2>Sign in to Sudoku Battle</h2>
<p>Click the button below to sign in to your account:</p>
<p>{{ .ConfirmationURL }}</p>

<p>Or enter this code: <strong>{{ .Token }}</strong></p>

<p>This code expires in 60 minutes.</p>
```

## Step 6: Test Authentication

1. Start your client development server: `cd client && npm run dev`
2. Open http://localhost:5174 in your browser
3. Click the "Sign In" button
4. Enter your email address
5. Check your email for the verification code
6. Enter the code to sign in
7. Your profile should appear in the top-left corner

## Step 7: Verify Database Setup

1. Go to **Table Editor** in Supabase dashboard
2. You should see:
   - **profiles** table (empty at first)
   - **game_results** table (empty at first)
3. After signing in, check the **profiles** table - you should see your user entry
4. Go to **Database** > **Views**
5. You should see the **leaderboard** view

## Step 8: Deploy to Production

### Client Deployment

1. Build the client with production environment:
   ```bash
   cd client
   npm run build
   ```

2. The `.env.production` file will be used automatically

3. Upload the `dist/` folder to your hosting

### Server Deployment

1. Add environment variables to your server hosting:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Restart your server

## Troubleshooting

### "Failed to send magic link"

- Check that your SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Verify email provider is enabled in Supabase dashboard
- Check browser console for detailed error messages

### "Invalid or expired code"

- Codes expire after 60 minutes
- Make sure you're using the latest code from your email
- Check that the email matches exactly (case-sensitive)

### "Failed to load leaderboard"

- Verify the leaderboard view was created successfully
- Check Row Level Security policies are set correctly
- Look at Supabase logs: **Logs** > **Postgres Logs**

### Emails not arriving

- Check your spam folder
- Verify your email address is correct
- Check Supabase email quota (free tier has limits)
- Go to **Authentication** > **Logs** to see if emails were sent

## Security Best Practices

1. **Never commit `.env` files** - they're in `.gitignore`
2. **Never expose service_role_key in client code**
3. **Use environment variables** for all sensitive data
4. **Keep Supabase packages updated** for security patches
5. **Monitor authentication logs** in Supabase dashboard

## What's Next?

- ✅ User authentication is set up
- ✅ Leaderboard is ready
- 🔜 Game results will be tracked automatically for PvP games
- 🔜 AI games are excluded from tracking (as specified)

## Support

If you encounter issues:
1. Check Supabase dashboard logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Review the SUPABASE_SCHEMA.sql file for any SQL errors
