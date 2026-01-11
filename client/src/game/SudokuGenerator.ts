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
    // Generate a complete puzzle and solve it to get a valid solution
    const puzzleArray = sudoku.makepuzzle();
    const solutionArray = sudoku.solvepuzzle(puzzleArray);

    if (!solutionArray) {
      throw new Error('Failed to generate valid Sudoku puzzle');
    }

    // Convert solution to grid
    const solution = this.arrayToGrid(solutionArray);

    // Start with an empty board (or with a few pre-filled cells)
    const board = this.createEmptyBoardWithHints(solution, preFillCount);

    return { board, solution };
  }

  /**
   * Create a board with optional pre-filled hint cells
   */
  private static createEmptyBoardWithHints(solution: number[][], hintCount: number): SudokuBoard {
    const cells: Cell[][] = [];

    // Initialize all cells as empty
    for (let row = 0; row < 9; row++) {
      cells[row] = [];
      for (let col = 0; col < 9; col++) {
        cells[row][col] = {
          value: null,
          locked: false,
          lockedBy: null,
          revealed: false
        };
      }
    }

    // Optionally add some hint cells
    if (hintCount > 0) {
      const positions: Array<[number, number]> = [];

      // Generate all possible positions
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          positions.push([row, col]);
        }
      }

      // Shuffle and pick random positions for hints
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      // Fill the hint cells
      for (let i = 0; i < Math.min(hintCount, positions.length); i++) {
        const [row, col] = positions[i];
        cells[row][col] = {
          value: solution[row][col],
          locked: true,
          lockedBy: 'system',
          revealed: false
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
          revealed: false
        };
      }
    }

    return { cells };
  }
}
