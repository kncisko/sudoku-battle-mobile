# Future Enhancements for Sudoku Battle

## Animations

### Reveal Tile Animation
- Add animation when random tiles are revealed (on wrong guess or timer expiry)
- Make the reveal more fun and engaging
- Current: Simple highlight with green background and pulse
- Goal: More dramatic reveal animation

### Win/Loss Animation
- Add "You Won!" animation when player wins
- Add "You've Lost!" animation when player loses
- Make the end game experience more exciting and rewarding
- Current: Simple text display with final scores
- Goal: Celebration/consolation animations

## Lobby Redesign

### Multiple Rooms View
- Show list of all available/active game rooms in lobby
- Display room information (players waiting, game status, etc.)
- Allow players to browse and join any open game directly
- No need to manually enter room code for public games

### Join Methods
1. **Browse & Join** (NEW)
   - See all available rooms in lobby
   - Click to join any game with open slot
   - Easier for casual players

2. **Direct Code Join** (KEEP EXISTING)
   - Keep current "join by code" functionality
   - Allows joining specific friend's game
   - Useful for private games

### Implementation Notes
- Public rooms visible in lobby browser
- Private/code-only rooms hidden from list
- Maintain current room code system for direct joins
