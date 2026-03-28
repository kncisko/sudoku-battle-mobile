export type LobbyStatus = 'available' | 'idle' | 'pending' | 'in_game';

export interface LobbyPlayer {
  socketId: string;
  userId: string;
  name: string;
  status: LobbyStatus;
  winRate: number;
  totalGames: number;
}

export type LobbyPlayerPublic = Omit<LobbyPlayer, 'socketId'>;

const STATUS_ORDER: Record<LobbyStatus, number> = {
  available: 0,
  idle: 1,
  pending: 2,
  in_game: 3,
};

/**
 * Manages the list of players in the lobby.
 *
 * IO is kept out of this class intentionally so it can be unit-tested
 * without a real server. The caller injects a `sendToSocket` function that
 * forwards `lobby_update` events; in production that is an `io.to(id).emit`
 * call, in tests it can be a simple spy.
 */
export class Lobby {
  private players = new Map<string, LobbyPlayer>(); // userId → LobbyPlayer
  private socketToUser = new Map<string, string>();  // socketId → userId
  private sendToSocket: (socketId: string, players: LobbyPlayerPublic[], total: number) => void;

  constructor(
    sendToSocket: (socketId: string, players: LobbyPlayerPublic[], total: number) => void,
  ) {
    this.sendToSocket = sendToSocket;
  }

  /** Add (or re-add) a player. If the userId already exists the old socket
   *  mapping is cleaned up first (reconnect scenario). */
  add(socketId: string, userId: string, name: string, winRate: number, totalGames: number): void {
    const existing = this.players.get(userId);
    if (existing) {
      this.socketToUser.delete(existing.socketId);
    }
    this.players.set(userId, { socketId, userId, name, status: 'available', winRate, totalGames });
    this.socketToUser.set(socketId, userId);
    this._broadcast();
  }

  /** Remove the player associated with this socket. Returns the removed player
   *  or undefined if the socket was not in the lobby. */
  removeBySocket(socketId: string): LobbyPlayer | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return undefined;
    const player = this.players.get(userId);
    this.players.delete(userId);
    this.socketToUser.delete(socketId);
    this._broadcast();
    return player;
  }

  updateStats(userId: string, winRate: number, totalGames: number): void {
    const player = this.players.get(userId);
    if (player) {
      player.winRate = winRate;
      player.totalGames = totalGames;
      this._broadcast();
    }
  }

  setStatus(userId: string, status: LobbyStatus): void {
    const player = this.players.get(userId);
    if (player && player.status !== status) {
      player.status = status;
      this._broadcast();
    }
  }

  setStatusBySocket(socketId: string, status: LobbyStatus): void {
    const userId = this.socketToUser.get(socketId);
    if (userId) this.setStatus(userId, status);
  }

  getUserIdBySocket(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  getPlayer(userId: string): LobbyPlayer | undefined {
    return this.players.get(userId);
  }

  size(): number {
    return this.players.size;
  }

  getSnapshot(): LobbyPlayerPublic[] {
    return Array.from(this.players.values())
      .map(({ socketId: _s, ...p }) => p)
      .sort((a, b) => {
        const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return diff !== 0 ? diff : b.winRate - a.winRate;
      });
  }

  private _broadcast(): void {
    const snapshot = this.getSnapshot();
    const total = this.players.size;
    for (const player of this.players.values()) {
      this.sendToSocket(player.socketId, snapshot, total);
    }
  }
}
