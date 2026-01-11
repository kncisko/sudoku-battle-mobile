# Multiplayer Sudoku - Build Plan

## Project Overview

A real-time multiplayer Sudoku game where 2 players compete to fill a shared board. Players take turns guessing numbers - correct guesses lock the cell and continue their turn, wrong guesses reveal a random cell and pass turn to opponent.

**Goal:** Build a POC to validate the concept and explore game balance.

---

## Tech Stack

### Client
- ⚡ Vite + Vue 3 (Composition API)
- 🎨 Tailwind CSS
- 🔌 Socket.IO client
- 📘 TypeScript

### Server
- 🚀 Node.js + Express
- 🔌 Socket.IO server
- 📘 TypeScript
- 🎲 Sudoku generation library

---

## Project Structure

```
multiplayer-sudoku/
├── client/          # Vue app
│   ├── src/
│   │   ├── components/
│   │   │   ├── SudokuBoard.vue
│   │   │   ├── GameLobby.vue
│   │   │   └── PlayerInfo.vue
│   │   ├── composables/
│   │   │   └── useSocket.ts
│   │   ├── types/
│   │   │   └── game.ts
│   │   └── App.vue
│   └── package.json
│
├── server/          # Node.js server
│   ├── src/
│   │   ├── game/
│   │   │   ├── GameRoom.ts
│   │   │   ├── SudokuGenerator.ts
│   │   │   └── GameLogic.ts
│   │   ├── types/
│   │   │   └── game.ts
│   │   └── index.ts
│   └── package.json
│
└── shared/          # Shared TypeScript types
    └── types.ts
```

---

## Build Sessions - Step by Step

### **Session 1: Project Setup & Basic Connection**

**Tasks:**
1. Create project structure
2. Set up client (Vue + Vite + Tailwind)
3. Set up server (Node + Express + Socket.IO)
4. Test basic Socket.IO connection
5. Display "Connected" message

**Goal:** See "Hello from server" in browser

**Deliverables:**
- Working client dev server
- Working server with Socket.IO
- Successful connection between client and server
- "Connected" status displayed in browser

---

### **Session 2: Sudoku Board Display**

**Tasks:**
1. Create shared TypeScript types for game state
2. Implement Sudoku generator (or integrate library)
3. Create SudokuBoard.vue component
4. Display 9x9 grid with Tailwind styling
5. Server generates and sends puzzle to client

**Goal:** See a working Sudoku board on screen

**Deliverables:**
- 9x9 Sudoku grid displayed
- Clean, responsive UI
- Generated puzzle with solution
- Cells show locked numbers

---

### **Session 3: Room System**

**Tasks:**
1. Implement room creation/joining logic (server)
2. Create GameLobby.vue component
3. Generate unique room codes
4. Wait for 2nd player to join
5. Start game when both players ready

**Goal:** Two browser tabs can join same room

**Deliverables:**
- Room code generation
- Join room UI
- Player list display
- "Waiting for opponent" state
- "Game starting" transition

---

### **Session 4: Turn-Based Gameplay**

**Tasks:**
1. Implement cell selection (click to select)
2. Number input/selection UI
3. Send move to server via Socket.IO
4. Server validates move against solution
5. Broadcast board updates to both players
6. Turn switching logic

**Goal:** Players can take turns making moves

**Deliverables:**
- Interactive board (click cells)
- Number selection UI
- Move validation
- Real-time board updates
- Turn indicator (whose turn it is)
- Move history display

---

### **Session 5: Game Rules & Win Condition**

**Tasks:**
1. Lock cells on correct guess
2. Continue turn on correct guess
3. Reveal random cell on wrong guess
4. Switch turn on wrong guess
5. Track score (cells locked per player)
6. Detect win condition
7. Display winner screen

**Goal:** Complete playable game

**Deliverables:**
- Full game loop working
- Score tracking
- Win detection
- Winner announcement
- Rematch button
- Game over state

---

### **Session 6: Polish & Testing**

**Tasks:**
1. Add cell animations (lock, reveal, select)
2. Improve visual feedback
3. Add sound effects (optional)
4. Mobile responsiveness
5. Error handling
6. Test with a friend
7. Iterate based on feedback

**Goal:** Fun, polished POC ready to demo

**Deliverables:**
- Smooth animations
- Good UX feedback
- Responsive design
- Bug-free gameplay
- Playtested and refined

---

## Game Rules (POC Version)

### Setup
1. Server generates a valid Sudoku puzzle with solution
2. Board starts empty (or with few pre-filled cells)
3. Players join room (2 players max)
4. Random player goes first

### Gameplay Loop
1. **Current player's turn:**
   - Player selects an empty cell
   - Player guesses a number (1-9)

2. **Validation:**
   - **Correct guess:**
     - Cell locks with player's color
     - Player's score increases by 1
     - Player continues their turn
   - **Wrong guess:**
     - Random empty cell reveals correct number (locked as neutral)
     - Turn passes to opponent

3. **Win Condition:**
   - Game ends when board is completely filled
   - Player with most locked cells wins
   - OR: First player to lock X cells wins (configurable)

### Special Rules
- Cannot select already locked cells
- Cannot skip turn
- 30-second time limit per move (optional for POC)

---

## Skill vs. Luck Balance

### Early Game (0-20% filled)
- **High luck:** Random guessing
- **Low skill:** Limited deduction possible

### Mid Game (20-60% filled)
- **Mixed:** Some cells have obvious answers
- **Growing skill:** Row/column/box elimination becomes useful

### Late Game (60%+ filled)
- **Low luck:** Most cells have 1-2 valid options
- **High skill:** Pure Sudoku deduction
- **Expert advantage:** Skilled players dominate

**This creates natural skill progression:**
- Beginners enjoy early luck
- Learning happens organically
- Experts win more often (but not always)

---

## Alternative Game Modes to Test

### Mode 1: Hot Potato (Default)
- Original design
- Keep guessing until wrong
- Random reveal on fail
- First to X cells or most at end wins

### Mode 2: Timed Turns
- Each player gets 30 seconds
- Guess as many as possible in time
- Most correct wins

### Mode 3: Simultaneous Play
- Both players see same board
- Both can make moves at same time
- First to complete row/column/box gets bonus
- More chaotic, faster paced

### Mode 4: Auction Style
- Players bid confidence (1-10)
- Higher bid goes first
- Correct = gain points, wrong = lose points
- More strategic

**For POC:** Start with Mode 1, possibly add Mode 3 if time permits.

---

## Technical Architecture

### Client-Server Communication (Socket.IO Events)

**Client → Server:**
```typescript
'join_room'        // Join game room
'make_move'        // Submit guess
'ready'            // Player ready to start
'rematch'          // Request rematch
```

**Server → Client:**
```typescript
'room_joined'      // Successful join
'player_joined'    // Opponent joined
'game_start'       // Game beginning
'board_update'     // Board state changed
'turn_change'      // Turn switched
'game_end'         // Game over
'error'            // Error occurred
```

### Game State (Server)

```typescript
interface GameRoom {
  id: string
  players: Player[]
  board: SudokuBoard
  solution: number[][]
  currentTurn: number  // Player index
  gameStatus: 'waiting' | 'playing' | 'finished'
  scores: Record<string, number>
}

interface SudokuBoard {
  cells: Cell[][]
}

interface Cell {
  value: number | null
  locked: boolean
  lockedBy: string | null  // Player ID
  revealed: boolean
}

interface Player {
  id: string
  name: string
  socketId: string
}
```

---

## Development Timeline

### Session 1: 2-3 hours
- Project setup
- Basic connection

### Session 2: 2-3 hours
- Sudoku board UI
- Generator integration

### Session 3: 2-3 hours
- Room system
- Multiplayer lobby

### Session 4: 3-4 hours
- Turn logic
- Move validation

### Session 5: 2-3 hours
- Game rules
- Win condition

### Session 6: 2-3 hours
- Polish
- Testing

**Total: 13-19 hours spread over multiple sessions**

---

## Success Metrics for POC

After building POC, evaluate:

### 1. **Is it fun?**
- Do players want to play again?
- Is there tension/excitement?
- Are turns engaging?

### 2. **Is skill rewarded?**
- Do Sudoku experts win more?
- Can beginners still enjoy it?
- Is there learning curve?

### 3. **What's the right pace?**
- Are turns too slow/fast?
- Should there be time limits?
- How long is average game?

### 4. **What needs improvement?**
- Where do players get confused?
- What's frustrating?
- What features are missing?

### 5. **Technical validation**
- Does Socket.IO work smoothly?
- Any lag/sync issues?
- Server performance OK?

---

## Potential Issues to Watch For

### Game Design
- ⚠️ First player advantage too strong?
- ⚠️ Snowball effect (winner keeps winning)?
- ⚠️ Too much waiting between turns?
- ⚠️ Not enough strategy early game?

**Solutions to test:**
- Alternate first player in rematches
- Add comeback mechanics
- Show opponent's moves in real-time
- Time limits to keep pace

### Technical
- ⚠️ Connection drops mid-game
- ⚠️ Sync issues between clients
- ⚠️ Sudoku generation performance
- ⚠️ Cheating (solving board offline)

**Solutions:**
- Reconnection logic
- Server as source of truth
- Pre-generate boards or use fast library
- Time limits (simple anti-cheat)

---

## Future Enhancements (Post-POC)

If POC is successful, consider:

### Features
- Ranked matchmaking
- ELO rating system
- Daily challenges
- Power-ups (hint, block opponent, etc.)
- Spectator mode
- Tournaments
- Custom board sizes (4x4, 6x6 for beginners)

### Technical
- User authentication
- Persistent stats/leaderboards
- Mobile apps (iOS/Android)
- Database for match history
- Deploy to cloud (Railway, Render, Fly.io)

### Monetization
- Free: Play with friends
- Premium: Ranked play, stats, ad-free
- Or: Ads + pay to remove

---

## Next Steps

1. **Session 1:** Set up project structure
2. Start building server first (simpler to test)
3. Then build client to connect to server
4. Iterate session by session
5. Test frequently
6. Get feedback early

**Let's build something fun! 🎮**

---

## Notes

- Focus on getting POC working first, polish later
- Test each session before moving to next
- Get a friend to playtest as early as possible
- Don't over-engineer - keep it simple
- Have fun and learn Socket.IO!

**Ready to start when you are!**
