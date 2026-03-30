import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import type { Player } from '../../../shared/types.js';
import { updateRatings, newPlayerRating, type PlayerRating } from './RatingService.js';

interface GameResult {
  player1_id: string;
  player2_id: string;
  winner_id: string | null;
  player1_score: number;
  player2_score: number;
  early_win: boolean;
  game_duration: number; // in seconds
}

export class GameTracker {
  private gameStartTime: number;
  private roomCode: string;
  private player1: Player | null = null;
  private player2: Player | null = null;
  private isAIGame: boolean = false;

  constructor(roomCode: string, isAIGame: boolean = false) {
    this.roomCode = roomCode;
    this.gameStartTime = Date.now();
    this.isAIGame = isAIGame;
  }

  /**
   * Register players when game starts
   */
  setPlayers(players: Player[]): void {
    if (players.length >= 1) this.player1 = players[0];
    if (players.length >= 2) this.player2 = players[1];
  }

  /**
   * Track game result to Supabase (only for authenticated PvP games)
   */
  async trackGameResult(
    winner: Player | null,
    scores: Record<string, number>,
    earlyWin: boolean
  ): Promise<void> {
    // Skip tracking if Supabase is not configured
    if (!isSupabaseConfigured || !supabase) {
      console.log(`[${this.roomCode}] Supabase not configured, skipping game result tracking`);
      return;
    }

    // Skip tracking for AI games
    if (this.isAIGame) {
      console.log(`[${this.roomCode}] AI game detected, skipping tracking (AI games are for practice only)`);
      return;
    }

    // Need exactly 2 players for PvP game
    if (!this.player1 || !this.player2) {
      console.log(`[${this.roomCode}] Not enough players for tracking (need 2 human players)`);
      return;
    }

    // Skip if either player is AI
    if (this.player1.socketId === 'ai' || this.player2.socketId === 'ai') {
      console.log(`[${this.roomCode}] AI player detected, skipping tracking`);
      return;
    }

    // Skip if either player is a guest (IDs starting with 'guest_')
    if (this.player1.id.startsWith('guest_') || this.player2.id.startsWith('guest_')) {
      console.log(`[${this.roomCode}] Guest player detected, skipping tracking (only authenticated PvP games are tracked)`);
      return;
    }

    // Validate that both player IDs are valid UUIDs (format check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this.player1.id) || !uuidRegex.test(this.player2.id)) {
      console.log(`[${this.roomCode}] Invalid player ID format (expected UUID), skipping tracking`);
      return;
    }

    try {
      const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);

      const gameResult: GameResult = {
        player1_id: this.player1.id,
        player2_id: this.player2.id,
        winner_id: winner?.id || null,
        player1_score: scores[this.player1.id] || 0,
        player2_score: scores[this.player2.id] || 0,
        early_win: earlyWin,
        game_duration: gameDuration
      };

      console.log(`[${this.roomCode}] Tracking PvP game result to Supabase:`, {
        winner: winner?.name || 'TIE',
        duration: `${gameDuration}s`,
        earlyWin
      });

      const { error } = await supabase
        .from('game_results')
        .insert([gameResult]);

      if (error) {
        if (error.code === '23503') {
          console.error(`[${this.roomCode}] Foreign key constraint violation - player not found in profiles table:`, error.message);
        } else if (error.code === '23505') {
          console.error(`[${this.roomCode}] Unique constraint violation:`, error.message);
        } else {
          console.error(`[${this.roomCode}] Failed to track game result:`, error.message);
        }
      } else {
        console.log(`[${this.roomCode}] ✓ Game result tracked successfully`);
        await this.updateGlickoRatings(winner);
      }
    } catch (error: any) {
      console.error(`[${this.roomCode}] Error tracking game result:`, error.message || error);
    }
  }

  /**
   * Fetch both players' current Glicko-2 ratings, compute new ratings, and write back.
   */
  private async updateGlickoRatings(winner: Player | null): Promise<void> {
    if (!supabase || !this.player1 || !this.player2) return;

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, rating, rd, vol')
        .in('id', [this.player1.id, this.player2.id]);

      if (error || !profiles || profiles.length !== 2) {
        console.warn(`[${this.roomCode}] Could not fetch profiles for rating update`);
        return;
      }

      const pMap = new Map(profiles.map((p: any) => [p.id, p]));
      const p1data = pMap.get(this.player1.id);
      const p2data = pMap.get(this.player2.id);

      const r1: PlayerRating = p1data?.rating != null
        ? { rating: p1data.rating, rd: p1data.rd, vol: p1data.vol }
        : newPlayerRating();
      const r2: PlayerRating = p2data?.rating != null
        ? { rating: p2data.rating, rd: p2data.rd, vol: p2data.vol }
        : newPlayerRating();

      const outcome: 1 | 0 | 0.5 =
        winner?.id === this.player1.id ? 1 :
        winner?.id === this.player2.id ? 0 : 0.5;

      const { player1: new1, player2: new2 } = updateRatings(r1, r2, outcome);

      await Promise.all([
        supabase.from('profiles').update({ rating: new1.rating, rd: new1.rd, vol: new1.vol })
          .eq('id', this.player1.id),
        supabase.from('profiles').update({ rating: new2.rating, rd: new2.rd, vol: new2.vol })
          .eq('id', this.player2.id)
      ]);

      console.log(
        `[${this.roomCode}] ✓ Ratings updated —`,
        `${this.player1.name}: ${Math.round(r1.rating)} → ${Math.round(new1.rating)}`,
        `| ${this.player2.name}: ${Math.round(r2.rating)} → ${Math.round(new2.rating)}`
      );
    } catch (err: any) {
      console.error(`[${this.roomCode}] Error updating Glicko-2 ratings:`, err.message || err);
    }
  }

  /**
   * Get user ID by socket ID (for mapping authenticated users)
   * Returns null if user is not authenticated
   */
  static async getUserIdBySocketId(socketId: string): Promise<string | null> {
    // This is a placeholder - in a real implementation, you would:
    // 1. Maintain a map of socketId -> userId when users connect
    // 2. Include user ID in the room creation/join events
    // 3. Or query from a session store

    // For now, we'll use the player ID which should be the user's ID
    // if they're authenticated
    return null;
  }
}
