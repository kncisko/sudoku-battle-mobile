import { Cell } from '../../../shared/types.js';

export type AIDifficulty = 'beginner' | 'normal' | 'expert';

export class AIPlayer {
  private board: Cell[][];
  private difficulty: AIDifficulty;

  constructor(board: Cell[][], difficulty: AIDifficulty = 'normal') {
    this.board = board;
    this.difficulty = difficulty;
  }

  /**
   * AI makes its move without knowing the solution
   * It uses Sudoku logic to determine possible values for each cell
   * Returns: { row, col, value } or null if no valid moves
   */
  public makeMove(): { row: number; col: number; value: number } | null {
    // Find all empty cells with their possible values
    const cellsWithPossibilities = this.findCellsWithPossibilities();

    if (cellsWithPossibilities.length === 0) {
      return null;
    }

    // Categorize moves by risk level
    const forcedMoves = cellsWithPossibilities.filter(cell => cell.possibilities.length === 1);
    const goodGuesses = cellsWithPossibilities.filter(cell =>
      cell.possibilities.length >= 2 && cell.possibilities.length <= 3
    );
    const riskyGuesses = cellsWithPossibilities.filter(cell =>
      cell.possibilities.length >= 4 && cell.possibilities.length <= 6
    );
    const veryRiskyGuesses = cellsWithPossibilities.filter(cell =>
      cell.possibilities.length >= 7
    );

    // Strategy varies by difficulty level
    let selectedCell;
    let strategyWeights: { forced: number; good: number; risky: number; veryRisky: number };

    switch (this.difficulty) {
      case 'beginner':
        // Beginner: 20% forced, 30% good, 40% risky, 10% very risky (~40% success rate)
        strategyWeights = { forced: 0.20, good: 0.30, risky: 0.40, veryRisky: 0.10 };
        break;
      case 'normal':
        // Normal: 30% forced, 40% good, 25% risky, 5% very risky (~50% success rate)
        strategyWeights = { forced: 0.30, good: 0.40, risky: 0.25, veryRisky: 0.05 };
        break;
      case 'expert':
        // Expert: 50% forced, 40% good, 10% risky, 0% very risky (~75% success rate)
        strategyWeights = { forced: 0.50, good: 0.40, risky: 0.10, veryRisky: 0.00 };
        break;
      default:
        strategyWeights = { forced: 0.30, good: 0.40, risky: 0.25, veryRisky: 0.05 };
    }

    const rand = Math.random();

    if (rand < strategyWeights.forced && forcedMoves.length > 0) {
      // Forced move (always correct)
      selectedCell = forcedMoves[Math.floor(Math.random() * forcedMoves.length)];
      return {
        row: selectedCell.row,
        col: selectedCell.col,
        value: selectedCell.possibilities[0]
      };
    } else if (rand < strategyWeights.forced + strategyWeights.good && goodGuesses.length > 0) {
      // Good guess (2-3 possibilities)
      selectedCell = goodGuesses[Math.floor(Math.random() * goodGuesses.length)];
      const value = selectedCell.possibilities[Math.floor(Math.random() * selectedCell.possibilities.length)];
      return {
        row: selectedCell.row,
        col: selectedCell.col,
        value
      };
    } else if (rand < strategyWeights.forced + strategyWeights.good + strategyWeights.risky && riskyGuesses.length > 0) {
      // Risky guess (4-6 possibilities)
      selectedCell = riskyGuesses[Math.floor(Math.random() * riskyGuesses.length)];
      const value = selectedCell.possibilities[Math.floor(Math.random() * selectedCell.possibilities.length)];
      return {
        row: selectedCell.row,
        col: selectedCell.col,
        value
      };
    } else if (veryRiskyGuesses.length > 0) {
      // Very risky guess (7-9 possibilities)
      selectedCell = veryRiskyGuesses[Math.floor(Math.random() * veryRiskyGuesses.length)];
      const value = selectedCell.possibilities[Math.floor(Math.random() * selectedCell.possibilities.length)];
      return {
        row: selectedCell.row,
        col: selectedCell.col,
        value
      };
    }

    // Fallback: Pick from all available cells, prefer fewer possibilities
    const allCells = cellsWithPossibilities.sort((a, b) =>
      a.possibilities.length - b.possibilities.length
    );

    const topCells = allCells.slice(0, Math.min(10, allCells.length));
    selectedCell = topCells[Math.floor(Math.random() * topCells.length)];

    const value = selectedCell.possibilities[Math.floor(Math.random() * selectedCell.possibilities.length)];

    return {
      row: selectedCell.row,
      col: selectedCell.col,
      value
    };
  }

  /**
   * Find all empty cells and determine their possible values based on Sudoku rules
   */
  private findCellsWithPossibilities(): Array<{
    row: number;
    col: number;
    possibilities: number[];
  }> {
    const cells: Array<{ row: number; col: number; possibilities: number[] }> = [];

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        // Skip if cell is already revealed
        if (this.board[row][col].value !== null) {
          continue;
        }

        // Find all possible values for this cell
        const possibilities = this.getPossibleValues(row, col);

        if (possibilities.length > 0) {
          cells.push({ row, col, possibilities });
        }
      }
    }

    return cells;
  }

  /**
   * Get all possible values for a cell based on current board state
   * (Uses Sudoku rules: no duplicates in row/column/box)
   */
  private getPossibleValues(row: number, col: number): number[] {
    const possible: number[] = [];

    for (let value = 1; value <= 9; value++) {
      if (this.isValuePossible(row, col, value)) {
        possible.push(value);
      }
    }

    return possible;
  }

  /**
   * Check if placing a value at (row, col) is valid according to Sudoku rules
   */
  private isValuePossible(row: number, col: number, value: number): boolean {
    // Check row - is this value already in the row?
    for (let c = 0; c < 9; c++) {
      if (this.board[row][c].value === value) {
        return false;
      }
    }

    // Check column - is this value already in the column?
    for (let r = 0; r < 9; r++) {
      if (this.board[r][col].value === value) {
        return false;
      }
    }

    // Check 3x3 box - is this value already in the box?
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (this.board[r][c].value === value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Update the AI's internal board state
   */
  public updateBoard(board: Cell[][]): void {
    this.board = board;
  }
}
