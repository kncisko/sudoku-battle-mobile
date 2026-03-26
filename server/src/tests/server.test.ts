/**
 * Integration tests for lobby socket events.
 *
 * The server (app.ts) is imported directly and bound to a random OS-assigned
 * port so tests never collide with each other or with a running dev server.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { io as ioClient, type Socket } from 'socket.io-client';
import { httpServer } from '../app.js';

// ─── server lifecycle ────────────────────────────────────────────────────────

let serverUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;
      serverUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    httpServer.close((err) => (err ? reject(err) : resolve()));
  });
});

// ─── helpers ────────────────────────────────────────────────────────────────

function connect(extraOpts: Record<string, unknown> = {}): Socket {
  return ioClient(serverUrl, {
    transports: ['websocket'],
    autoConnect: true,
    ...extraOpts,
  });
}

function waitFor<T = unknown>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function disconnectAll(...sockets: Socket[]) {
  for (const s of sockets) {
    if (s.connected) s.disconnect();
  }
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('Lobby socket events', () => {
  let client: Socket;

  beforeEach(async () => {
    client = connect();
    await waitFor(client, 'connect');
  });

  afterEach(() => {
    disconnectAll(client);
  });

  it('join_lobby — server broadcasts lobby_update with the new player', async () => {
    const updatePromise = waitFor<{ players: unknown[]; total: number }>(client, 'lobby_update');

    client.emit('join_lobby', { userId: 'user-test-1', name: 'Alice' });

    const update = await updatePromise;
    expect(update.total).toBe(1);
    expect(update.players).toHaveLength(1);
    expect(update.players[0]).toMatchObject({ name: 'Alice', status: 'available' });
  });

  it('join_lobby — requires userId, emits lobby_error otherwise', async () => {
    const errorPromise = waitFor<{ message: string }>(client, 'lobby_error');

    client.emit('join_lobby', { userId: '', name: 'Ghost' });

    const err = await errorPromise;
    expect(err.message).toMatch(/authentication/i);
  });

  it('leave_lobby — removes player; remaining members receive updated list', async () => {
    // Watcher stays in the lobby so it can receive the broadcast after Bob leaves
    const watcher = connect();
    await waitFor(watcher, 'connect');

    const watcherJoined = waitFor(watcher, 'lobby_update');
    watcher.emit('join_lobby', { userId: 'user-watcher-leave', name: 'Watcher' });
    await watcherJoined;

    // Bob joins
    const bobJoined = waitFor(client, 'lobby_update');
    client.emit('join_lobby', { userId: 'user-leave-1', name: 'Bob' });
    await bobJoined;

    // Bob leaves — watcher should receive updated list with only themselves
    const afterLeave = waitFor<{ total: number; players: Array<{ name: string }> }>(watcher, 'lobby_update');
    client.emit('leave_lobby');
    const update = await afterLeave;

    expect(update.total).toBe(1);
    expect(update.players[0].name).toBe('Watcher');

    disconnectAll(watcher);
  });

  it('set_idle / set_available — changes status correctly', async () => {
    // Join
    const joined = waitFor(client, 'lobby_update');
    client.emit('join_lobby', { userId: 'user-idle-1', name: 'Carol' });
    await joined;

    // Go idle
    const idleUpdate = waitFor<{ players: Array<{ status: string }> }>(client, 'lobby_update');
    client.emit('set_idle');
    const idleResult = await idleUpdate;
    expect(idleResult.players[0].status).toBe('idle');

    // Come back
    const availUpdate = waitFor<{ players: Array<{ status: string }> }>(client, 'lobby_update');
    client.emit('set_available');
    const availResult = await availUpdate;
    expect(availResult.players[0].status).toBe('available');
  });

  it('disconnect — player is removed from lobby', async () => {
    // Two clients: watcher stays connected to receive the broadcast
    const watcher = connect();
    await waitFor(watcher, 'connect');

    // Watcher joins lobby first
    const watcherJoined = waitFor(watcher, 'lobby_update');
    watcher.emit('join_lobby', { userId: 'user-watcher', name: 'Watcher' });
    await watcherJoined;

    // Client joins lobby
    const clientJoined = waitFor(client, 'lobby_update');
    client.emit('join_lobby', { userId: 'user-dc-test', name: 'Dave' });
    await clientJoined;

    // Watcher waits for the broadcast triggered by Dave's disconnect
    const afterDisconnect = waitFor<{ total: number; players: Array<{ name: string }> }>(watcher, 'lobby_update');
    client.disconnect();
    const update = await afterDisconnect;

    // Watcher should see only themselves left
    expect(update.total).toBe(1);
    expect(update.players[0]).toMatchObject({ name: 'Watcher' });

    disconnectAll(watcher);
  });

  it('multiple players — lobby_update is sent to all members when someone joins', async () => {
    const client2 = connect();
    await waitFor(client2, 'connect');

    // Eve joins first
    const eveJoined = waitFor(client, 'lobby_update');
    client.emit('join_lobby', { userId: 'multi-1', name: 'Eve' });
    await eveJoined;

    // Set up both listeners before Frank joins
    const client1Update = waitFor<{ total: number }>(client, 'lobby_update');
    const client2Update = waitFor<{ total: number }>(client2, 'lobby_update');
    client2.emit('join_lobby', { userId: 'multi-2', name: 'Frank' });

    const [update1, update2] = await Promise.all([client1Update, client2Update]);

    expect(update1.total).toBe(2);
    expect(update2.total).toBe(2);

    disconnectAll(client2);
  });
});
