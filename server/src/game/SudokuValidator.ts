/**
 * Validates a scanned sudoku grid.
 * Grid format: 9x9 array of numbers, 1-9 for given digits, 0 for empty cells.
 */

export interface ValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Check that no row, column, or 3x3 box contains duplicate digits (1-9).
 * Zeros (empty cells) are ignored.
 */
function isLegal(grid: number[][]): boolean {
  for (let i = 0; i < 9; i++) {
    const row = new Set<number>()
    const col = new Set<number>()
    const box = new Set<number>()

    for (let j = 0; j < 9; j++) {
      // Row check
      const rv = grid[i][j]
      if (rv !== 0) {
        if (row.has(rv)) return false
        row.add(rv)
      }

      // Column check
      const cv = grid[j][i]
      if (cv !== 0) {
        if (col.has(cv)) return false
        col.add(cv)
      }

      // Box check (3x3)
      const br = 3 * Math.floor(i / 3) + Math.floor(j / 3)
      const bc = 3 * (i % 3) + (j % 3)
      const bv = grid[br][bc]
      if (bv !== 0) {
        if (box.has(bv)) return false
        box.add(bv)
      }
    }
  }
  return true
}

/**
 * Backtracking solver that counts solutions up to `limit`.
 * Stops early once limit is reached — so pass limit=2 to distinguish
 * "no solution" / "unique solution" / "multiple solutions".
 */
function countSolutions(grid: number[][], limit = 2): number {
  // Find first empty cell
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        let count = 0
        for (let digit = 1; digit <= 9; digit++) {
          grid[r][c] = digit
          if (isLegal(grid)) {
            count += countSolutions(grid, limit - count)
            if (count >= limit) {
              grid[r][c] = 0
              return count
            }
          }
          grid[r][c] = 0
        }
        return count
      }
    }
  }
  // No empty cells — completed solution found
  return 1
}

/**
 * Backtracking solver that returns the completed grid, or null if unsolvable.
 * Mutates a deep copy internally — the original grid is not modified.
 */
export function solveGrid(grid: number[][]): number[][] | null {
  const g = grid.map(row => [...row]);

  function solve(): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (g[r][c] === 0) {
          for (let d = 1; d <= 9; d++) {
            g[r][c] = d;
            if (isLegal(g) && solve()) return true;
            g[r][c] = 0;
          }
          return false;
        }
      }
    }
    return true; // no empty cells
  }

  return solve() ? g : null;
}

/**
 * Full validation: legal check + unique solution check.
 */
export function validateGrid(grid: number[][]): ValidationResult {
  if (!isLegal(grid)) {
    return { valid: false, reason: 'Puzzle contains duplicate digits in a row, column, or box.' }
  }

  // Deep copy so the solver doesn't mutate the original
  const copy = grid.map(row => [...row])
  const solutions = countSolutions(copy)

  if (solutions === 0) {
    return { valid: false, reason: 'Puzzle has no valid solution.' }
  }
  if (solutions > 1) {
    return { valid: false, reason: 'Puzzle has multiple solutions.' }
  }

  return { valid: true }
}
