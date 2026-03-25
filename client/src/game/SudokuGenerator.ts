// @ts-ignore - sudoku package doesn't have TypeScript types
import sudoku from 'sudoku';
import { SudokuBoard, Cell } from '../../../shared/types';

export class SudokuGenerator {
  /**
   * Generate a new Sudoku puzzle with its solution
   * For multiplayer game: board starts empty, but we have the complete solution
   * Players compete to fill in the cells correctly
   */
  static generatePuzzle(preFillCount: number = 0): { board: SudokuBoard; solution: number[][] } {
    // Generate a puzzle - makepuzzle returns a puzzle with guaranteed unique solution
    const puzzleArray = sudoku.makepuzzle();
    const solutionArray = sudoku.solvepuzzle(puzzleArray);

    if (!solutionArray) {
      throw new Error('Failed to generate valid Sudoku puzzle');
    }

    // Convert solution to grid (1-9 format)
    const solution = this.arrayToGrid(solutionArray);

    // Create board using the original puzzle pattern (preserves unique solution guarantee)
    const board = this.createBoardFromPuzzle(puzzleArray, solution, preFillCount);

    return { board, solution };
  }

  /**
   * Create a board from the library's puzzle pattern to preserve unique solution guarantee
   * The puzzleArray from makepuzzle() has specific cells filled to ensure uniqueness
   * We use those cells as the base, then optionally add more hints for easier difficulties
   */
  private static createBoardFromPuzzle(
    puzzleArray: (number | null)[],
    solution: number[][],
    targetHintCount: number
  ): SudokuBoard {
    const cells: Cell[][] = [];

    // Track which cells are pre-filled by the original puzzle (these guarantee uniqueness)
    const originalClues: Array<[number, number]> = [];
    const emptyCells: Array<[number, number]> = [];

    // Initialize board with the original puzzle clues
    for (let row = 0; row < 9; row++) {
      cells[row] = [];
      for (let col = 0; col < 9; col++) {
        const index = row * 9 + col;
        const puzzleValue = puzzleArray[index];

        if (puzzleValue !== null) {
          // This is an original clue - convert from 0-8 to 1-9
          cells[row][col] = {
            value: puzzleValue + 1,
            locked: true,
            lockedBy: 'system',
            revealed: false,
            notes: []
          };
          originalClues.push([row, col]);
        } else {
          // Empty cell
          cells[row][col] = {
            value: null,
            locked: false,
            lockedBy: null,
            revealed: false,
            notes: []
          };
          emptyCells.push([row, col]);
        }
      }
    }

    // If we need more hints than the original puzzle provides, add more from empty cells
    // Adding more clues never breaks uniqueness (it only removes possible solutions)
    const currentClueCount = originalClues.length;
    if (targetHintCount > currentClueCount && emptyCells.length > 0) {
      // Shuffle empty cells to randomly select additional hints
      for (let i = emptyCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
      }

      // Add additional hints up to target count
      const hintsToAdd = Math.min(targetHintCount - currentClueCount, emptyCells.length);
      for (let i = 0; i < hintsToAdd; i++) {
        const [row, col] = emptyCells[i];
        cells[row][col] = {
          value: solution[row][col],
          locked: true,
          lockedBy: 'system',
          revealed: false,
          notes: []
        };
      }
    }

    return { cells };
  }

  /**
   * Convert flat array to 9x9 number grid
   * The sudoku library uses 0-8 for values, we convert to 1-9
   */
  private static arrayToGrid(arr: number[]): number[][] {
    const grid: number[][] = [];

    for (let row = 0; row < 9; row++) {
      grid[row] = [];
      for (let col = 0; col < 9; col++) {
        const index = row * 9 + col;
        grid[row][col] = arr[index] + 1; // Convert 0-8 to 1-9
      }
    }

    return grid;
  }

  /**
   * Create an empty board (useful for testing)
   */
  static createEmptyBoard(): SudokuBoard {
    const cells: Cell[][] = [];

    for (let row = 0; row < 9; row++) {
      cells[row] = [];
      for (let col = 0; col < 9; col++) {
        cells[row][col] = {
          value: null,
          locked: false,
          lockedBy: null,
          revealed: false,
          notes: []
        };
      }
    }

    return { cells };
  }
}
