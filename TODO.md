


# Multiplayer Sudoku - TODO List

## User Profiles & Leaderboards

- [ ] Set up Supabase project and configure authentication
- [ ] Create database schema (profiles, game_history tables)
- [ ] Implement user login/signup UI with Supabase Auth
- [ ] Add guest mode toggle (play without tracking)
- [ ] Track game results and update user stats in Supabase
- [ ] Build leaderboard UI with filters (all-time, weekly, monthly)

## Offline Functionality

- [ ] Move Sudoku generator logic to client-side for offline play
- [ ] Move AI player logic to client-side for offline play
- [ ] Implement offline AI game mode (no Socket.IO connection)
- [ ] Add online/offline detection and show appropriate game modes
- [ ] Implement local storage for offline game stats
- [ ] Sync offline stats to Supabase when connection is restored

## Help Documentation

- [ ] Write help documentation for standard Sudoku rules
- [ ] Write help documentation for Battle Sudoku rules
- [ ] Create help/tutorial UI with modal or slide-out panel
- [ ] Add help button (?) in app header near music button

## Database Schema (Draft)

### profiles table
```sql
- id: uuid (primary key, references auth.users)
- username: text (unique)
- avatar_url: text (optional)
- wins: integer (default 0)
- losses: integer (default 0)
- ties: integer (default 0)
- total_games: integer (default 0)
- created_at: timestamp
- updated_at: timestamp
```

### game_history table
```sql

- id: uuid (primary key)
- player1_id: uuid (references profiles.id)
- player2_id: uuid (references profiles.id, nullable for AI games)
- winner_id: uuid (references profiles.id, nullable for ties)
- player1_score: integer
- player2_score: integer
- game_mode: text ('multiplayer' | 'ai_online' | 'ai_offline')
- ai_difficulty: text (nullable, 'beginner' | 'normal' | 'expert')
- duration_seconds: integer
- completed_at: timestamp
```

## Game Modes Structure

### Online (requires internet)
- **Multiplayer** - vs human opponent (tracked if logged in)
- **AI Opponent** - vs AI (tracked if logged in)
- **Guest Mode** - no tracking, but still online multiplayer

### Offline (no internet required)
- **AI Practice** - vs AI only, stats stored locally
- Auto-sync stats when connection restored (if logged in)

## Help Documentation Content

### Standard Sudoku Rules
- Fill 9x9 grid with numbers 1-9
- Each row must contain 1-9 (no repeats)
- Each column must contain 1-9 (no repeats)
- Each 3x3 box must contain 1-9 (no repeats)

### Battle Sudoku Rules
- Turn-based gameplay (20 seconds per turn)
- **Correct guess** → cell locks with your color, you continue playing
- **Wrong guess** → random cell revealed (neutral), turn switches to opponent
- **Timer expires** → random cell revealed (neutral), turn switches
- **Winner** = player who locks the most cells when board is full

### AI Difficulty Levels
- **Beginner**: AI makes many mistakes (~40% success rate)
- **Normal**: Balanced challenge (~50% success rate)
- **Expert**: Very challenging (~75% success rate)

## Notes
- App store requires offline functionality → AI practice mode essential
- Supabase for online stats, local storage for offline stats
- Guest mode allows play without any tracking
- Sync mechanism needed for offline→online stat migration
