import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import PlayerLobby from '../components/PlayerLobby.vue'
import type { LobbyPlayerPublic } from '../composables/useSocket'

// ── fixtures ─────────────────────────────────────────────────────────────────

const ALICE: LobbyPlayerPublic = {
  userId: 'u-alice',
  name: 'Alice',
  status: 'available',
  winRate: 0.65,
  totalGames: 30,
}

const BOB: LobbyPlayerPublic = {
  userId: 'u-bob',
  name: 'Bob',
  status: 'idle',
  winRate: 0.4,
  totalGames: 10,
}

const IN_GAME: LobbyPlayerPublic = {
  userId: 'u-carol',
  name: 'Carol',
  status: 'in_game',
  winRate: 0.8,
  totalGames: 100,
}

function mountLobby(overrides: Partial<{
  lobbyPlayers: LobbyPlayerPublic[]
  lobbyTotal: number
  isConnected: boolean
  authenticatedUserId: string | null
  authenticatedUsername: string | null
  outgoingChallenge: { targetUserId: string; targetName: string } | null
  challengeError: string | null
}> = {}) {
  return mount(PlayerLobby, {
    props: {
      lobbyPlayers: [],
      lobbyTotal: 0,
      isConnected: true,
      authenticatedUserId: null,
      authenticatedUsername: null,
      outgoingChallenge: null,
      challengeError: null,
      ...overrides,
    },
  })
}

/** Click the Lobby button to open the lobby view, or set it directly when the button is hidden. */
async function openLobby(wrapper: ReturnType<typeof mountLobby>) {
  const btn = wrapper.find('button.bg-indigo-500')
  if (btn.exists()) {
    await btn.trigger('click')
  } else {
    // Lobby button is hidden (e.g. offline) — set state directly via defineExpose
    ;(wrapper.vm as any).showLobby = true
    await nextTick()
  }
}

// ── rendering ─────────────────────────────────────────────────────────────────

describe('PlayerLobby — rendering', () => {
  it('shows "No available players" when list is empty (default Available mode)', async () => {
    const wrapper = mountLobby()
    await openLobby(wrapper)
    expect(wrapper.text()).toContain('No available players right now')
  })

  it('renders available players in default mode', async () => {
    const wrapper = mountLobby({ lobbyPlayers: [ALICE, BOB], lobbyTotal: 2 })
    await openLobby(wrapper)
    expect(wrapper.text()).toContain('Alice')    // available — shown
    expect(wrapper.text()).not.toContain('Bob')  // idle — hidden in Available mode
  })

  it('renders all players when Show All is active', async () => {
    const wrapper = mountLobby({ lobbyPlayers: [ALICE, BOB], lobbyTotal: 2 })
    await openLobby(wrapper)
    ;(wrapper.vm as any).showAll = true
    await nextTick()
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
  })

  it('shows win rate and game count for players with history', async () => {
    const wrapper = mountLobby({ lobbyPlayers: [ALICE], lobbyTotal: 1 })
    await openLobby(wrapper)
    expect(wrapper.text()).toContain('65%')
    expect(wrapper.text()).toContain('30')
  })

  it('omits stats row for players with 0 games', async () => {
    const noStats: LobbyPlayerPublic = { ...ALICE, winRate: 0, totalGames: 0 }
    const wrapper = mountLobby({ lobbyPlayers: [noStats], lobbyTotal: 1 })
    await openLobby(wrapper)
    // the stats span is only rendered v-if="player.totalGames > 0"
    expect(wrapper.text()).not.toContain('%')
  })

  it('labels the authenticated user with "(you)"', async () => {
    const wrapper = mountLobby({
      lobbyPlayers: [ALICE, BOB],
      lobbyTotal: 2,
      authenticatedUserId: 'u-alice',
      authenticatedUsername: 'Alice',
    })
    await openLobby(wrapper)
    expect(wrapper.text()).toContain('(you)')
  })

  it('does not show "(you)" for other players', async () => {
    const wrapper = mountLobby({
      lobbyPlayers: [ALICE, BOB],
      lobbyTotal: 2,
      authenticatedUserId: 'u-alice',
    })
    await openLobby(wrapper)
    // Only Alice should have "(you)" - count occurrences
    const text = wrapper.text()
    const count = (text.match(/\(you\)/g) || []).length
    expect(count).toBe(1)
  })

  it('shows the online count when total > 0', () => {
    const wrapper = mountLobby({ lobbyPlayers: [ALICE], lobbyTotal: 1 })
    expect(wrapper.text()).toContain('1 online')
  })

  it('shows online count for multiple players', () => {
    const wrapper = mountLobby({ lobbyPlayers: [ALICE, BOB], lobbyTotal: 2 })
    expect(wrapper.text()).toContain('2 online')
  })

  it('shows status labels correctly when Show All is active', async () => {
    const wrapper = mountLobby({ lobbyPlayers: [ALICE, BOB, IN_GAME], lobbyTotal: 3 })
    await openLobby(wrapper)
    ;(wrapper.vm as any).showAll = true
    await nextTick()
    expect(wrapper.text()).toContain('Available')
    expect(wrapper.text()).toContain('Away')
    expect(wrapper.text()).toContain('In game')
  })
})

// ── sign-in banner ────────────────────────────────────────────────────────────

describe('PlayerLobby — sign-in banner', () => {
  it('shows sign-in prompt when not authenticated and connected', async () => {
    const wrapper = mountLobby({ authenticatedUserId: null, isConnected: true })
    await openLobby(wrapper)
    expect(wrapper.text()).toContain('Sign in')
  })

  it('hides sign-in prompt when authenticated', async () => {
    const wrapper = mountLobby({ authenticatedUserId: 'u-1', authenticatedUsername: 'Alice' })
    await openLobby(wrapper)
    expect(wrapper.text()).not.toContain('Sign in to appear')
  })

  it('emits showAuth when sign-in link is clicked', async () => {
    const wrapper = mountLobby({ authenticatedUserId: null })
    await openLobby(wrapper)
    const buttons = wrapper.findAll('button')
    const signInButton = buttons.find(b => b.text().includes('Sign in'))
    await signInButton!.trigger('click')
    expect(wrapper.emitted('showAuth')).toHaveLength(1)
  })
})

// ── offline banner ────────────────────────────────────────────────────────────

describe('PlayerLobby — offline state', () => {
  it('hides lobby button when not connected', () => {
    const wrapper = mountLobby({ isConnected: false })
    expect(wrapper.find('button.bg-indigo-500').exists()).toBe(false)
  })

  it('shows offline banner inside lobby view when not connected', async () => {
    const wrapper = mountLobby({ isConnected: false })
    await openLobby(wrapper) // sets showLobby directly via defineExpose
    expect(wrapper.text()).toContain('No connection')
  })

  it('hides Create Room and Join buttons when offline', () => {
    const wrapper = mountLobby({ isConnected: false })
    expect(wrapper.text()).not.toContain('Create Multiplayer Room')
    expect(wrapper.text()).not.toContain('Join with Room Code')
  })
})

// ── create room ───────────────────────────────────────────────────────────────

describe('PlayerLobby — Create Room', () => {
  it('emits createRoom with authenticated username', async () => {
    const wrapper = mountLobby({ authenticatedUserId: 'u-1', authenticatedUsername: 'Alice' })
    await wrapper.find('button.bg-blue-500').trigger('click')
    expect(wrapper.emitted('createRoom')).toEqual([['Alice']])
  })

  it('uses a random fallback name when not authenticated', async () => {
    const wrapper = mountLobby({ authenticatedUserId: null })
    await wrapper.find('button.bg-blue-500').trigger('click')
    const emitted = wrapper.emitted('createRoom') as string[][]
    expect(emitted[0][0]).toMatch(/^Player\d+$/)
  })
})

// ── join form ─────────────────────────────────────────────────────────────────

describe('PlayerLobby — Join with Code', () => {
  it('shows join form after clicking "Join with Room Code"', async () => {
    const wrapper = mountLobby({ authenticatedUserId: 'u-1', authenticatedUsername: 'Alice' })
    await wrapper.find('button.bg-purple-500').trigger('click')
    expect(wrapper.find('input[placeholder="Enter 6-character code..."]').exists()).toBe(true)
  })

  it('emits joinRoom with code and name', async () => {
    const wrapper = mountLobby({ authenticatedUserId: 'u-1', authenticatedUsername: 'Alice' })
    await wrapper.find('button.bg-purple-500').trigger('click')
    const codeInput = wrapper.find('input[placeholder="Enter 6-character code..."]')
    await codeInput.setValue('abc123')
    await wrapper.find('button.bg-green-500').trigger('click')
    expect(wrapper.emitted('joinRoom')).toEqual([['ABC123', 'Alice']])
  })

  it('normalises room code to uppercase', async () => {
    const wrapper = mountLobby({ authenticatedUserId: 'u-1', authenticatedUsername: 'Alice' })
    await wrapper.find('button.bg-purple-500').trigger('click')
    await wrapper.find('input[placeholder="Enter 6-character code..."]').setValue('abcdef')
    await wrapper.find('button.bg-green-500').trigger('click')
    const emitted = wrapper.emitted('joinRoom') as string[][]
    expect(emitted[0][0]).toBe('ABCDEF')
  })

  it('does not emit joinRoom when code is blank', async () => {
    const wrapper = mountLobby({ authenticatedUserId: 'u-1', authenticatedUsername: 'Alice' })
    await wrapper.find('button.bg-purple-500').trigger('click')
    await wrapper.find('button.bg-green-500').trigger('click')
    expect(wrapper.emitted('joinRoom')).toBeUndefined()
  })

  it('Cancel hides the join form', async () => {
    const wrapper = mountLobby({ authenticatedUserId: 'u-1', authenticatedUsername: 'Alice' })
    await wrapper.find('button.bg-purple-500').trigger('click')
    // Cancel button is the last button in the join form
    const buttons = wrapper.findAll('button')
    const cancelBtn = buttons.find(b => b.text() === 'Cancel')
    await cancelBtn!.trigger('click')
    expect(wrapper.find('input[placeholder="Enter 6-character code..."]').exists()).toBe(false)
  })
})

// ── back ──────────────────────────────────────────────────────────────────────

describe('PlayerLobby — Back button', () => {
  it('emits back when Back button is clicked', async () => {
    const wrapper = mountLobby()
    const buttons = wrapper.findAll('button')
    const backBtn = buttons.find(b => b.text().includes('Back to Game Selection'))
    await backBtn!.trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })
})

// ── challenge button ──────────────────────────────────────────────────────────

describe('PlayerLobby — Challenge button', () => {
  it('shows an active Challenge button for available non-self players when authenticated', async () => {
    const wrapper = mountLobby({
      lobbyPlayers: [ALICE],
      lobbyTotal: 1,
      authenticatedUserId: 'u-other',
    })
    await openLobby(wrapper)
    const buttons = wrapper.findAll('button')
    const btn = buttons.find(b => b.text() === 'Challenge')
    expect(btn?.exists()).toBe(true)
    expect(btn?.element.disabled).toBe(false)
  })

  it('emits challenge with the target userId when clicked', async () => {
    const wrapper = mountLobby({
      lobbyPlayers: [ALICE],
      lobbyTotal: 1,
      authenticatedUserId: 'u-other',
    })
    await openLobby(wrapper)
    const buttons = wrapper.findAll('button')
    const btn = buttons.find(b => b.text() === 'Challenge')
    await btn!.trigger('click')
    expect(wrapper.emitted('challenge')).toEqual([['u-alice']])
  })

  it('hides Challenge button when user is not authenticated', async () => {
    const wrapper = mountLobby({
      lobbyPlayers: [ALICE],
      lobbyTotal: 1,
      authenticatedUserId: null,
    })
    await openLobby(wrapper)
    expect(wrapper.text()).not.toContain('Challenge')
  })

  it('hides Challenge button while outgoing challenge is pending', async () => {
    const wrapper = mountLobby({
      lobbyPlayers: [ALICE],
      lobbyTotal: 1,
      authenticatedUserId: 'u-other',
      outgoingChallenge: { targetUserId: 'u-alice', targetName: 'Alice' },
    })
    await openLobby(wrapper)
    const buttons = wrapper.findAll('button')
    const btn = buttons.find(b => b.text() === 'Challenge')
    expect(btn).toBeUndefined()
  })

  it('does not show Challenge button for in_game players', async () => {
    const wrapper = mountLobby({
      lobbyPlayers: [IN_GAME],
      lobbyTotal: 1,
      authenticatedUserId: 'u-other',
    })
    await openLobby(wrapper)
    expect(wrapper.text()).not.toContain('Challenge')
  })

  it('does not show Challenge button for the authenticated user themselves', async () => {
    const wrapper = mountLobby({
      lobbyPlayers: [ALICE],
      lobbyTotal: 1,
      authenticatedUserId: 'u-alice',
    })
    await openLobby(wrapper)
    expect(wrapper.text()).not.toContain('Challenge')
  })
})

// ── idle detection ────────────────────────────────────────────────────────────

describe('PlayerLobby — idle detection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits setIdle after 5 minutes of inactivity', async () => {
    const wrapper = mountLobby()
    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(wrapper.emitted('setIdle')).toHaveLength(1)
  })

  it('does not emit setIdle before 5 minutes', () => {
    const wrapper = mountLobby()
    vi.advanceTimersByTime(4 * 60 * 1000 + 59_000)
    expect(wrapper.emitted('setIdle')).toBeUndefined()
  })

  it('resets the idle timer on user interaction', async () => {
    const wrapper = mountLobby()
    // Advance 4 minutes
    vi.advanceTimersByTime(4 * 60 * 1000)
    // Simulate user touching the screen (fires the document listener)
    document.dispatchEvent(new Event('touchstart'))
    // Advance another 4 minutes — still under the 5-min window
    vi.advanceTimersByTime(4 * 60 * 1000)
    expect(wrapper.emitted('setIdle')).toBeUndefined()
  })

  it('emits setAvailable after going idle then interacting', async () => {
    const wrapper = mountLobby()
    // Go idle
    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(wrapper.emitted('setIdle')).toHaveLength(1)
    // Come back
    document.dispatchEvent(new Event('mousedown'))
    expect(wrapper.emitted('setAvailable')).toHaveLength(1)
  })

  it('cleans up the timer on unmount', () => {
    const wrapper = mountLobby()
    wrapper.unmount()
    // No timer should fire after unmount
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(wrapper.emitted('setIdle')).toBeUndefined()
  })
})
