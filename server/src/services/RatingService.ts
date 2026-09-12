/**
 * Glicko-2 rating system implementation.
 * Reference: http://www.glicko.net/glicko/glicko2.pdf
 *
 * Each player has three values:
 *   rating  — skill estimate (displayed, ~1500 for average)
 *   rd      — Rating Deviation: how confident we are in the rating (lower = more confident)
 *   vol     — volatility: how erratic the player's results have been
 */

const SCALE = 173.7178 // Conversion factor between Glicko-1 and Glicko-2 scales
const TAU = 0.5        // System constant — constrains how fast volatility can change

export const DEFAULT_RATING = 1500
export const DEFAULT_RD = 350
export const DEFAULT_VOL = 0.06
export const PLACEMENT_RD_THRESHOLD = 150 // RD above this = player is in placement

export interface PlayerRating {
  rating: number
  rd: number
  vol: number
}

export const newPlayerRating = (): PlayerRating => ({
  rating: DEFAULT_RATING,
  rd: DEFAULT_RD,
  vol: DEFAULT_VOL
})

/**
 * Conservative display estimate — what we sort the leaderboard by.
 * Penalises uncertainty so new/inactive players don't dominate the top.
 * Formula used by Lichess: rating - 2 * RD
 */
export const conservativeEstimate = (r: PlayerRating): number =>
  Math.max(0, Math.round(r.rating - 2 * r.rd))

// ── Internal Glicko-2 math ────────────────────────────────────────────────────

function toScale(rating: number, rd: number): { mu: number; phi: number } {
  return { mu: (rating - 1500) / SCALE, phi: rd / SCALE }
}

function fromScale(mu: number, phi: number): { rating: number; rd: number } {
  return { rating: SCALE * mu + 1500, rd: SCALE * phi }
}

function gPhi(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
}

function expectedScore(mu: number, mu_j: number, phi_j: number): number {
  return 1 / (1 + Math.exp(-gPhi(phi_j) * (mu - mu_j)))
}

function updateOne(
  player: PlayerRating,
  games: Array<{ opponent: PlayerRating; score: number }>
): PlayerRating {
  const { mu, phi } = toScale(player.rating, player.rd)
  let sigma = player.vol

  // Step 3 — estimated variance v
  let vInv = 0
  for (const { opponent } of games) {
    const { mu: mj, phi: phij } = toScale(opponent.rating, opponent.rd)
    const gj = gPhi(phij)
    const ej = expectedScore(mu, mj, phij)
    vInv += gj * gj * ej * (1 - ej)
  }
  const v = 1 / vInv

  // Step 4 — improvement delta
  let sumD = 0
  for (const { opponent, score } of games) {
    const { mu: mj, phi: phij } = toScale(opponent.rating, opponent.rd)
    const gj = gPhi(phij)
    const ej = expectedScore(mu, mj, phij)
    sumD += gj * (score - ej)
  }
  const delta = v * sumD

  // Step 5 — new volatility (Illinois algorithm)
  const a = Math.log(sigma * sigma)
  const dSq = delta * delta
  const phiSq = phi * phi

  const f = (x: number): number => {
    const ex = Math.exp(x)
    return (
      (ex * (dSq - phiSq - v - ex)) / (2 * Math.pow(phiSq + v + ex, 2)) -
      (x - a) / (TAU * TAU)
    )
  }

  let A = a
  let B = dSq > phiSq + v ? Math.log(dSq - phiSq - v) : a - TAU
  while (f(B) < 0) B -= TAU // find B where f(B) >= 0 to bracket the root with A

  let fA = f(A), fB = f(B)
  const EPSILON = 1e-6
  let iter = 0
  while (Math.abs(B - A) > EPSILON && iter++ < 1000) {
    const C = A + (A - B) * fA / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) { A = B; fA = fB } else { fA /= 2 }
    B = C; fB = fC
  }
  const newSigma = Math.exp(A / 2)

  // Steps 6-8 — update phi and mu
  const phiStar = Math.sqrt(phiSq + newSigma * newSigma)
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  let muSum = 0
  for (const { opponent, score } of games) {
    const { mu: mj, phi: phij } = toScale(opponent.rating, opponent.rd)
    muSum += gPhi(phij) * (score - expectedScore(mu, mj, phij))
  }
  const newMu = mu + newPhi * newPhi * muSum

  const { rating, rd } = fromScale(newMu, newPhi)
  return {
    rating: Math.round(rating * 10) / 10,
    rd: Math.round(rd * 10) / 10,
    vol: Math.round(newSigma * 1e5) / 1e5
  }
}

/**
 * Update both players' ratings after a 1v1 game.
 * outcome: 1 = player1 wins, 0 = player1 loses, 0.5 = draw
 */
export function updateRatings(
  player1: PlayerRating,
  player2: PlayerRating,
  outcome: 1 | 0 | 0.5
): { player1: PlayerRating; player2: PlayerRating } {
  const p2score = outcome === 1 ? 0 : outcome === 0 ? 1 : 0.5
  return {
    player1: updateOne(player1, [{ opponent: player2, score: outcome }]),
    player2: updateOne(player2, [{ opponent: player1, score: p2score }])
  }
}
