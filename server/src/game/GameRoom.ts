import { GameRoom as GameRoomType, Player, SudokuBoard, GameStatus } from '../../../shared/types.js';
import { SudokuGenerator } from './SudokuGenerator.js';
import { getRandomColorScheme } from './ColorSchemes.js';
import { AIPlayer, AIDifficulty } from './AIPlayer.js';
import { GameTracker } from '../services/GameTracker.js';

export class GameRoom {
  private room: GameRoomType;
  private aiPlayer: AIPlayer | null = null;
  private isAIGame: boolean = false;
  private earlyWinDetected: boolean = false;
  private gameTracker: GameTracker;
  private turnStartTime: number = 0; // Timestamp when current turn started

  constructor(roomId: string, withAI: boolean = false, aiDifficulty: AIDifficulty = 'normal') {
    this.isAIGame = withAI;
    const { board, solution } = SudokuGenerator.generatePuzzle(10); // Start with 10 pre-revealed tiles

    // DEBUG: Count locked cells
    let lockedCount = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board.cells[row][col].locked) lockedCount++;
      }
    }
    console.log(`[${roomId}] Board created with ${lockedCount} pre-revealed tiles`)

    this.room = {
      id: roomId,
      players: [],
      board,
      solution,
      currentTurn: 0,
      gameStatus: 'waiting',
      scores: {}
    };

    // Initialize game tracker
    this.gameTracker = new GameTracker(roomId, withAI);

    // Initialize AI player if this is an AI game
    if (withAI) {
      this.aiPlayer = new AIPlayer(this.room.board.cells, aiDifficulty);
    }
  }

  // Check if this is an AI game
  isAIEnabled(): boolean {
    return this.isAIGame;
  }

  // Get room ID
  getId(): string {
    return this.room.id;
  }

  // Get full room state
  getState(): GameRoomType {
    return this.room;
  }

  // Get current game status
  getStatus(): GameStatus {
    return this.room.gameStatus;
  }

  // Get players
  getPlayers(): Player[] {
    return this.room.players;
  }

  // Get player count
  getPlayerCount(): number {
    return this.room.players.length;
  }

  // Check if room is full
  isFull(): boolean {
    return this.room.players.length >= 2;
  }

  // Add a player to the room
  addPlayer(socketId: string, playerName: string, userId?: string | null): boolean {
    if (this.isFull()) {
      return false;
    }

    // Use userId if provided (authenticated user), otherwise generate guest ID
    const playerId = userId || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const player: Player = {
      id: playerId,
      name: playerName,
      socketId,
      colorScheme: getRandomColorScheme(this.room.id),
      userId: userId || null  // Store the authenticated user ID
    };

    this.room.players.push(player);
    this.room.scores[playerId] = 0;

    // If this is an AI game and we just added the first player, add AI as second player
    if (this.isAIGame && this.room.players.length === 1) {
      const aiPlayerId = `guest_ai_${Date.now()}`;
      const aiPlayer: Player = {
        id: aiPlayerId,
        name: 'AI Opponent',
        socketId: 'ai',
        colorScheme: getRandomColorScheme(this.room.id),
        userId: null  // AI players are never authenticated
      };

      this.room.players.push(aiPlayer);
      this.room.scores[aiPlayerId] = 0;
    }

    return true;
  }

  // Remove a player from the room
  removePlayer(socketId: string): Player | null {
    const playerIndex = this.room.players.findIndex(p => p.socketId === socketId);

    if (playerIndex === -1) {
      return null;
    }

    const [removedPlayer] = this.room.players.splice(playerIndex, 1);
    delete this.room.scores[removedPlayer.id];

    // If game was playing and a player left, end the game
    if (this.room.gameStatus === 'playing') {
      this.room.gameStatus = 'finished';
    }

    return removedPlayer;
  }

  // Find player by socket ID
  getPlayerBySocketId(socketId: string): Player | null {
    return this.room.players.find(p => p.socketId === socketId) || null;
  }

  // Update a player's socket ID (for reconnection)
  updatePlayerSocketId(oldSocketId: string, newSocketId: string): boolean {
    const player = this.room.players.find(p => p.socketId === oldSocketId);
    if (player) {
      player.socketId = newSocketId;
      console.log(`[${this.room.id}] Updated socket ID for ${player.name}: ${oldSocketId} -> ${newSocketId}`);
      return true;
    }
    return false;
  }

  // Find player by ID (useful for reconnection)
  getPlayerById(playerId: string): Player | null {
    return this.room.players.find(p => p.id === playerId) || null;
  }

  // Start the game (when both players are ready)
  startGame(): boolean {
    if (this.room.players.length !== 2) {
      return false;
    }

    if (this.room.gameStatus !== 'waiting') {
      return false;
    }

    this.room.gameStatus = 'playing';

    // Register players with game tracker
    this.gameTracker.setPlayers(this.room.players);

    // Randomly choose who goes first
    this.room.currentTurn = Math.floor(Math.random() * 2);

    // Record when this turn started
    this.turnStartTime = Date.now();

    console.log(`[${this.room.id}] Game starting - randomly selected turn index: ${this.room.currentTurn}`);
    console.log(`[${this.room.id}] First player: ${this.room.players[this.room.currentTurn].name} (${this.room.players[this.room.currentTurn].id})`);

    return true;
  }

  // Get current player
  getCurrentPlayer(): Player | null {
    if (this.room.currentTurn < 0 || this.room.currentTurn >= this.room.players.length) {
      return null;
    }
    return this.room.players[this.room.currentTurn];
  }

  // Switch turn to next player
  switchTurn(): void {
    this.room.currentTurn = (this.room.currentTurn + 1) % this.room.players.length;
    // Record when this turn started
    this.turnStartTime = Date.now();
  }

  // Get turn start time
  getTurnStartTime(): number {
    return this.turnStartTime;
  }

  // Get board (for sending to clients)
  getBoard(): SudokuBoard {
    return this.room.board;
  }

  // Get scores
  getScores(): Record<string, number> {
    return this.room.scores;
  }

  // Validate a move (to be implemented in Session 4)
  validateMove(row: number, col: number, value: number): boolean {
    // Check if cell is already locked
    if (this.room.board.cells[row][col].locked) {
      return false;
    }

    // Check if value matches solution
    return this.room.solution[row][col] === value;
  }

  // Make a move (to be implemented fully in Session 4)
  makeMove(playerId: string, row: number, col: number, value: number): {
    success: boolean;
    revealedCell?: { row: number; col: number };
  } {
    // Special case: timer expiry (system auto-move)
    if (playerId === 'system') {
      // Don't validate - just reveal a random cell and switch turn
      const revealedCell = this.revealRandomCell();
      this.switchTurn();
      return { success: false, revealedCell };
    }

    const isCorrect = this.validateMove(row, col, value);

    if (isCorrect) {
      // Lock the cell - turn does NOT switch on correct answer
      this.room.board.cells[row][col].value = value;
      this.room.board.cells[row][col].locked = true;
      this.room.board.cells[row][col].lockedBy = playerId;

      // Update score
      this.room.scores[playerId]++;

      // Update AI's internal board state if this is an AI game
      if (this.aiPlayer) {
        this.aiPlayer.updateBoard(this.room.board.cells);
      }

      return { success: true };
    } else {
      // Wrong guess - reveal a random cell and switch turn
      const revealedCell = this.revealRandomCell();
      this.switchTurn();

      // Update AI's internal board state if this is an AI game
      if (this.aiPlayer) {
        this.aiPlayer.updateBoard(this.room.board.cells);
      }

      return { success: false, revealedCell };
    }
  }

  // Get AI's move
  getAIMove(): { row: number; col: number; value: number } | null {
    if (!this.aiPlayer) {
      return null;
    }

    return this.aiPlayer.makeMove();
  }

  // Reveal a random empty cell
  private revealRandomCell(): { row: number; col: number } | undefined {
    const emptyCells: Array<{ row: number; col: number }> = [];

    // Find all empty cells
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!this.room.board.cells[row][col].locked) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length === 0) {
      return undefined;
    }

    // Pick a random empty cell
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];

    // Reveal the cell
    this.room.board.cells[row][col].value = this.room.solution[row][col];
    this.room.board.cells[row][col].locked = true;
    this.room.board.cells[row][col].revealed = true;
    this.room.board.cells[row][col].lockedBy = 'system';

    return { row, col };
  }

  // Count remaining empty cells
  private countRemainingCells(): number {
    let count = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!this.room.board.cells[row][col].locked) {
          count++;
        }
      }
    }
    return count;
  }

  // Check if one player has mathematically won (early win detection)
  private checkEarlyWin(): boolean {
    if (this.room.players.length !== 2) {
      return false;
    }

    const [player1, player2] = this.room.players;
    const score1 = this.room.scores[player1.id] || 0;
    const score2 = this.room.scores[player2.id] || 0;
    const remainingCells = this.countRemainingCells();

    // If one player's lead is greater than remaining cells, they've won
    if (score1 > score2 + remainingCells) {
      console.log(`[${this.room.id}] Early win detected: ${player1.name} has ${score1} cells, ${player2.name} has ${score2}, only ${remainingCells} cells remain`);
      this.room.gameStatus = 'finished';
      this.earlyWinDetected = true;
      return true;
    }

    if (score2 > score1 + remainingCells) {
      console.log(`[${this.room.id}] Early win detected: ${player2.name} has ${score2} cells, ${player1.name} has ${score1}, only ${remainingCells} cells remain`);
      this.room.gameStatus = 'finished';
      this.earlyWinDetected = true;
      return true;
    }

    return false;
  }

  // Check if the game ended via early win detection
  isEarlyWin(): boolean {
    return this.earlyWinDetected;
  }

  // Check if game is finished
  isGameFinished(): boolean {
    // First check for early win (mathematical impossibility to catch up)
    if (this.checkEarlyWin()) {
      return true;
    }

    // Check if all cells are locked
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!this.room.board.cells[row][col].locked) {
          return false;
        }
      }
    }

    this.room.gameStatus = 'finished';
    return true;
  }

  // Get winner
  getWinner(): Player | null {
    if (this.room.gameStatus !== 'finished') {
      return null;
    }

    const [player1, player2] = this.room.players;
    if (!player1 || !player2) return null;

    const score1 = this.room.scores[player1.id] || 0;
    const score2 = this.room.scores[player2.id] || 0;

    if (score1 > score2) return player1;
    if (score2 > score1) return player2;
    return null; // Tie
  }

  // Get the game tracker (for tracking results)
  getGameTracker(): GameTracker {
    return this.gameTracker;
  }
}
