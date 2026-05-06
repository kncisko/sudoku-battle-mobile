<script setup lang="ts">
import { computed, ref, onMounted, watch, onUnmounted } from 'vue'
import { useSocket } from './composables/useSocket'
import { useOfflineGame } from './composables/useOfflineGame'
import { useClassicGame } from './composables/useClassicGame'
import { useAuth } from './composables/useAuth'
import { useStats } from './composables/useStats'
import { initializeTickSound } from './composables/useTickSound'
import SudokuBoard from './components/SudokuBoard.vue'
import GameLobby from './components/GameLobby.vue'
import PlayerLobby from './components/PlayerLobby.vue'
import ChallengeModal from './components/ChallengeModal.vue'
import GameModeSelector from './components/GameModeSelector.vue'
import ClassicDifficultySelector from './components/ClassicDifficultySelector.vue'
import HelpModal from './components/HelpModal.vue'
import AuthModal from './components/AuthModal.vue'
import UserProfile from './components/UserProfile.vue'
import Leaderboard from './components/Leaderboard.vue'
import type { AIDifficulty } from './game/AIPlayer'
import type { Player } from '../../shared/types'
import { NativeAudio } from '@capacitor-community/native-audio'
import { Capacitor } from '@capacitor/core'
import { KeepAwake } from '@capacitor-community/keep-awake'

// Splash screen state
const showSplash = ref(true)

// Game mode selection state
const gameModeSelected = ref(false)
const showPlayerLobby = ref(false)
const showClassicDifficulty = ref(false)

// Help modal state
const showHelp = ref(false)
const helpDefaultTab = ref<'sudoku' | 'battle' | 'ai' | 'rating' | undefined>(undefined)

// Auth modal states
const showAuthModal = ref(false)
const showProfileDropdown = ref(false)
const showLeaderboard = ref(false)
const authModalRef = ref<InstanceType<typeof AuthModal> | null>(null)

// Auth and stats
const auth = useAuth()
const userStats = useStats()

// Game mode: 'online', 'offline', or 'classic'
const gameMode = ref<'online' | 'offline' | 'classic'>('online')

// Game instances
const classicGame = useClassicGame()

// Audio state
const isMuted = ref(false)
const isAudioInitialized = ref(false)
const isCapacitor = Capacitor.isNativePlatform()
const isIOS = Capacitor.getPlatform() === 'ios'

// HTML5 Audio elements for background music (Android only)
// NativeAudio.loop() is broken on Android, so we use HTML5 Audio there
let splashAudio: HTMLAudioElement | null = null
let gameAudio: HTMLAudioElement | null = null

// Audio IDs for NativeAudio (iOS only)
const SPLASH_AUDIO_ID = 'splash_music'
const GAME_AUDIO_ID = 'game_music'
// iOS requires MP3, Android uses OGG
const SPLASH_AUDIO_PATH = 'public/assets/puzzled_groove.mp3'
const GAME_AUDIO_PATH = 'public/assets/sudoku_serenade.mp3'

onMounted(async () => {
  // Check if there's a saved game to restore
  try {
    const savedGame = localStorage.getItem('sudoku_battle_game_state')
    if (savedGame) {
      const gameState = JSON.parse(savedGame)
      // Only auto-restore if saved within last 30 minutes
      if (Date.now() - gameState.timestamp < 30 * 60 * 1000) {
        console.log('📁 Found saved game, skipping mode selector')
        gameModeSelected.value = true
      }
    }
  } catch (e) {
    console.warn('Failed to check for saved game:', e)
  }

  // Hide splash screen after 3 seconds (start this immediately)
  setTimeout(() => {
    showSplash.value = false
  }, 3000)

  // Initialize tick sound for timer
  await initializeTickSound()

  // Initialize audio based on platform
  // iOS: Use NativeAudio (works perfectly)
  // Android: Use HTML5 Audio (NativeAudio.loop() is broken)
  if (isIOS && isCapacitor) {
    // iOS - Use NativeAudio (original working implementation)
    try {
      await NativeAudio.preload({
        assetId: SPLASH_AUDIO_ID,
        assetPath: SPLASH_AUDIO_PATH,
        audioChannelNum: 1,
        isUrl: false,
        volume: 0.5
      })

      await NativeAudio.preload({
        assetId: GAME_AUDIO_ID,
        assetPath: GAME_AUDIO_PATH,
        audioChannelNum: 1,
        isUrl: false,
        volume: 0.5
      })

      await NativeAudio.loop({ assetId: SPLASH_AUDIO_ID })
      isAudioInitialized.value = true
    } catch (error) {
      console.log('iOS audio initialization error:', error)
    }
  } else {
    // Android or Web - Use HTML5 Audio
    try {
      splashAudio = new Audio('/assets/puzzled_groove.ogg')
      splashAudio.loop = true
      splashAudio.volume = 0.5

      gameAudio = new Audio('/assets/sudoku_serenade.ogg')
      gameAudio.loop = true
      gameAudio.volume = 0.5

      // Try to play, but it might fail due to autoplay policy
      try {
        await splashAudio.play()
        isAudioInitialized.value = true
      } catch (playError) {
        console.log('Autoplay prevented, will start on user interaction')
        // Set up one-time click listener to start audio on first user interaction
        const startAudioOnInteraction = async () => {
          if (!isAudioInitialized.value && splashAudio && !isMuted.value) {
            try {
              await splashAudio.play()
              isAudioInitialized.value = true
              console.log('Audio started after user interaction')
            } catch (e) {
              console.log('Failed to start audio:', e)
            }
          }
          document.removeEventListener('click', startAudioOnInteraction)
          document.removeEventListener('touchstart', startAudioOnInteraction)
        }
        document.addEventListener('click', startAudioOnInteraction, { once: true })
        document.addEventListener('touchstart', startAudioOnInteraction, { once: true })
      }
    } catch (error) {
      console.log('HTML5 audio initialization error:', error)
    }
  }
})

const toggleMute = async () => {
  isMuted.value = !isMuted.value
  // Note: tickSoundMuted is separate - music button only controls music

  if (isIOS && isCapacitor) {
    // iOS - Use NativeAudio
    try {
      if (isMuted.value) {
        await NativeAudio.stop({ assetId: SPLASH_AUDIO_ID })
        await NativeAudio.stop({ assetId: GAME_AUDIO_ID })
      } else {
        if (gameStatus.value === 'playing') {
          await NativeAudio.loop({ assetId: GAME_AUDIO_ID })
        } else {
          await NativeAudio.loop({ assetId: SPLASH_AUDIO_ID })
        }
      }
    } catch (error) {
      console.log('iOS toggle mute error:', error)
    }
  } else {
    // Android - Use HTML5 Audio
    if (isMuted.value) {
      splashAudio?.pause()
      gameAudio?.pause()
    } else {
      if (gameStatus.value === 'playing') {
        gameAudio?.play()
      } else {
        splashAudio?.play()
      }
    }
  }
}

onUnmounted(async () => {
  if (reconnectCountdownTimer !== null) {
    clearInterval(reconnectCountdownTimer)
    reconnectCountdownTimer = null
  }
  if (isIOS && isCapacitor) {
    // iOS - Clean up NativeAudio
    try {
      await NativeAudio.unload({ assetId: SPLASH_AUDIO_ID })
      await NativeAudio.unload({ assetId: GAME_AUDIO_ID })
    } catch (error) {
      console.log('iOS audio cleanup error:', error)
    }
  } else {
    // Android - Clean up HTML5 Audio
    if (splashAudio) {
      splashAudio.pause()
      splashAudio = null
    }
    if (gameAudio) {
      gameAudio.pause()
      gameAudio = null
    }
  }
})

// Online game (Socket.IO)
const onlineGame = useSocket()

// Offline game (local)
const offlineGame = useOfflineGame()

// Unified computed properties that switch based on game mode
const board = computed(() => gameMode.value === 'online' ? onlineGame.board.value : offlineGame.board.value)
const players = computed(() => gameMode.value === 'online' ? onlineGame.players.value : offlineGame.players.value)
const gameStatus = computed(() => gameMode.value === 'online' ? onlineGame.gameStatus.value : offlineGame.gameStatus.value)
const currentTurn = computed(() => gameMode.value === 'online' ? onlineGame.currentTurn.value : offlineGame.currentTurn.value)
const scores = computed(() => gameMode.value === 'online' ? onlineGame.scores.value : offlineGame.scores.value)
const revealedCell = computed(() => gameMode.value === 'online' ? onlineGame.revealedCell.value : offlineGame.revealedCell.value)
const lastLockedCell = computed(() => gameMode.value === 'online' ? onlineGame.lastLockedCell.value : offlineGame.lastLockedCell.value)
const winner = computed(() => gameMode.value === 'online' ? onlineGame.winner.value : offlineGame.winner.value)
const myPlayerId = computed(() => gameMode.value === 'online' ? onlineGame.myPlayerId.value : offlineGame.myPlayerId.value)
const remainingTime = computed(() => gameMode.value === 'online' ? onlineGame.remainingTime.value : offlineGame.remainingTime.value)
const earlyWin = computed(() => gameMode.value === 'online' ? onlineGame.earlyWin.value : offlineGame.earlyWin.value)
const isConnected = computed(() => onlineGame.isConnected.value)
const connectionStatus = computed(() => onlineGame.connectionStatus.value)
const connectionAttempts = computed(() => onlineGame.connectionAttempts.value)
const moveStatus = computed(() => onlineGame.moveStatus.value)
const isSlowConnection = computed(() => onlineGame.isSlowConnection.value)

const isWaiting = computed(() => gameStatus.value === 'waiting' && (onlineGame.roomCode.value !== null || gameMode.value === 'offline'))
const isPlaying = computed(() => gameStatus.value === 'playing')
const isFinished = computed(() => gameStatus.value === 'finished')

// Opponent disconnection countdown
const reconnectSecondsLeft = ref(0)
let reconnectCountdownTimer: number | null = null

watch(() => onlineGame.opponentDisconnected.value, (disconnected) => {
  if (disconnected) {
    const update = () => {
      const deadline = onlineGame.reconnectDeadline.value
      reconnectSecondsLeft.value = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0
    }
    update()
    reconnectCountdownTimer = window.setInterval(update, 500)
  } else {
    if (reconnectCountdownTimer !== null) {
      clearInterval(reconnectCountdownTimer)
      reconnectCountdownTimer = null
    }
  }
})

// Determine if it's the current user's turn
const isMyTurn = computed(() => {
  if (!currentTurn.value || !myPlayerId.value) return false
  return myPlayerId.value === currentTurn.value
})

// Flash effect for player name tag when turn changes
const flashingPlayerId = ref<string | null>(null)
let previousTurn = ref<string | null>(null)

// End game animation
const showEndButton = ref(false)

const handleEndGame = () => {
  if (gameMode.value === 'online') {
    // Disconnect from current room and reset state
    if (onlineGame.socket.value) {
      onlineGame.socket.value.disconnect()
      onlineGame.socket.value.connect()
    }
    // Reset online game state
    onlineGame.resetGame()
    // Return to player lobby after an online game
    showPlayerLobby.value = true
  } else {
    // Reset offline game
    offlineGame.resetGame()
  }

  // Reset game mode to online for next game
  gameMode.value = 'online'
  showEndButton.value = false
}

const handleCreateOfflineGame = (playerName: string, difficulty: AIDifficulty) => {
  gameMode.value = 'offline'
  offlineGame.startOfflineGame(playerName, difficulty)
}

// Online game handlers with userId
const handleCreateRoom = (playerName: string) => {
  onlineGame.createRoom(playerName, auth.user.value?.id)
}

const handleCreateAIGame = (playerName: string, difficulty: AIDifficulty) => {
  onlineGame.createAIGame(playerName, difficulty, auth.user.value?.id)
}

const handleJoinRoom = (roomCode: string, playerName: string) => {
  onlineGame.joinRoom(roomCode, playerName, auth.user.value?.id)
}

// PlayerLobby handlers
const handlePlayerLobbyCreateRoom = (playerName: string) => {
  showPlayerLobby.value = false
  handleCreateRoom(playerName)
}

const handlePlayerLobbyJoinRoom = (roomCode: string, playerName: string) => {
  showPlayerLobby.value = false
  handleJoinRoom(roomCode, playerName)
}

const handlePlayerLobbyBack = () => {
  onlineGame.leaveLobby()
  showPlayerLobby.value = false
  gameModeSelected.value = false
}

const handlePlayerLobbyCreateAIGame = (playerName: string, difficulty: AIDifficulty) => {
  showPlayerLobby.value = false
  handleCreateAIGame(playerName, difficulty)
}

// When a room code arrives while in the PlayerLobby (challenge accepted), navigate to game room
watch(() => onlineGame.roomCode.value, (code) => {
  if (code && showPlayerLobby.value) {
    showPlayerLobby.value = false
  }
})

// Join/leave lobby when PlayerLobby screen is shown/hidden
watch(showPlayerLobby, (showing) => {
  if (showing && auth.user.value) {
    const name = auth.profile.value?.username || auth.user.value.email || 'Player'
    onlineGame.joinLobby(auth.user.value.id, name)
  } else if (!showing) {
    onlineGame.leaveLobby()
  }
})

// Also join lobby if the user signs in while already on the lobby screen
watch(() => auth.user.value, (user) => {
  if (user && showPlayerLobby.value) {
    const name = auth.profile.value?.username || user.email || 'Player'
    onlineGame.joinLobby(user.id, name)
  }
})

const handleMakeMove = (row: number, col: number, value: number | null) => {
  // Classic mode uses null to clear cells, but online/offline modes don't support clearing
  if (value === null) return

  if (gameMode.value === 'online') {
    onlineGame.makeMove(row, col, value)
  } else {
    offlineGame.makeMove(row, col, value)
  }
}

// Store username temporarily until verification
const pendingUsername = ref<string | null>(null)

// Auth handlers
const handleSignIn = async (email: string, username: string) => {
  pendingUsername.value = username
  const result = await auth.signInWithEmail(email)
  if (result.success && authModalRef.value) {
    authModalRef.value.showCodeStep()
  } else if (!result.success && authModalRef.value) {
    authModalRef.value.showError(auth.error.value || 'Failed to send code')
    pendingUsername.value = null
  }
}

const handleVerifyCode = async (email: string, code: string) => {
  const result = await auth.verifyOtp(email, code)
  if (result.success && authModalRef.value) {
    authModalRef.value.showSuccess()
    // Set username if we have one pending
    if (auth.user.value && pendingUsername.value) {
      await auth.updateUsername(pendingUsername.value)
      pendingUsername.value = null
    }
    // Load user stats
    if (auth.user.value) {
      await userStats.loadStats(auth.user.value.id)
    }
  } else if (!result.success && authModalRef.value) {
    authModalRef.value.showError(auth.error.value || 'Invalid code')
  }
}

const handleSignOut = async () => {
  await auth.signOut()
  showProfileDropdown.value = false
  userStats.stats.value = null
}

const handleUpdateUsername = async (username: string) => {
  await auth.updateUsername(username)
  // Reload stats to get updated username
  if (auth.user.value) {
    await userStats.loadStats(auth.user.value.id)
  }
}

// Game mode selection handler
const handleGameModeSelect = (mode: 'battle' | 'classic') => {
  if (mode === 'battle') {
    gameMode.value = 'online'
    gameModeSelected.value = true
    showPlayerLobby.value = true // show player lobby first
  } else if (mode === 'classic') {
    // Show difficulty selection for Classic Sudoku
    showClassicDifficulty.value = true
  }
}

// Classic difficulty selection handler
const handleClassicDifficultySelect = (difficulty: 'easy' | 'medium' | 'hard') => {
  console.log('Selected Classic Sudoku difficulty:', difficulty)

  // Set game mode to classic
  gameMode.value = 'classic'

  // Generate and start the game
  classicGame.startGame(difficulty)

  // Hide difficulty selector and show game
  showClassicDifficulty.value = false
  gameModeSelected.value = true
}

// Back from difficulty selector
const handleBackFromDifficulty = () => {
  showClassicDifficulty.value = false
  // Reset game mode to default (online) when going back to mode selector
  gameMode.value = 'online'
}

// Leave game handler
const handleLeaveGame = async () => {
  if (gameMode.value === 'online') {
    onlineGame.resetGame()
  } else if (gameMode.value === 'offline') {
    offlineGame.resetGame()
  } else if (gameMode.value === 'classic') {
    classicGame.resetGame()
    // For classic mode, go back to difficulty selection instead of mode selection
    gameModeSelected.value = false
    showClassicDifficulty.value = true
    return
  }
  // Reset game mode
  gameMode.value = 'online'
  // Return to mode selection
  gameModeSelected.value = false
  showPlayerLobby.value = false
  onlineGame.leaveLobby()

  // Switch back to splash music
  if (!isMuted.value) {
    if (isIOS && isCapacitor) {
      // iOS - Use NativeAudio
      try {
        await NativeAudio.stop({ assetId: GAME_AUDIO_ID }).catch(() => {})
        await NativeAudio.stop({ assetId: SPLASH_AUDIO_ID }).catch(() => {})

        // Play once to start from beginning, then loop
        await NativeAudio.play({ assetId: SPLASH_AUDIO_ID })
        setTimeout(async () => {
          await NativeAudio.stop({ assetId: SPLASH_AUDIO_ID }).catch(() => {})
          await NativeAudio.loop({ assetId: SPLASH_AUDIO_ID })
        }, 100)
      } catch (error) {
        console.log('iOS leave game music restart error:', error)
      }
    } else {
      // Android - Use HTML5 Audio
      gameAudio?.pause()
      if (splashAudio) {
        splashAudio.currentTime = 0
        splashAudio.play()
      }
    }
  }
}

// Force reset (clear everything including localStorage)
const handleForceReset = () => {
  // Clear localStorage
  try {
    localStorage.removeItem('sudoku_battle_game_state')
  } catch (e) {
    console.warn('Failed to clear localStorage:', e)
  }

  // Reset games
  onlineGame.resetGame()
  offlineGame.resetGame()

  // Disconnect and reconnect socket
  if (onlineGame.socket.value) {
    onlineGame.socket.value.disconnect()
    onlineGame.socket.value.connect()
  }

  // Reset mode
  gameMode.value = 'online'

  // Force reload page
  setTimeout(() => {
    window.location.reload()
  }, 100)
}

// Check if game is tracked (both players authenticated)
const isTrackedGame = computed(() => {
  if (gameMode.value === 'offline' || players.value.length < 2) {
    return false
  }
  // Game is tracked if both players don't have guest IDs
  return players.value.every((player: Player) => !player.id.startsWith('guest_'))
})

// Load stats when user logs in
watch(() => auth.user.value, async (newUser) => {
  if (newUser) {
    await userStats.loadStats(newUser.id)
    // Close auth modal if it's open when user signs in
    showAuthModal.value = false
  }
})

watch(currentTurn, (newTurn) => {
  // Flash the current player's name tag when turn changes
  if (newTurn && previousTurn.value !== newTurn) {
    // If game is starting, wait for the board to be visible (2 seconds)
    const delay = (gameMode.value === 'online' && onlineGame.gameStarting.value) ? 2000 : 0

    setTimeout(() => {
      flashingPlayerId.value = newTurn
      setTimeout(() => {
        flashingPlayerId.value = null
      }, 500) // Flash for 0.5 seconds
    }, delay)
  }
  previousTurn.value = newTurn
})

// Track current playing audio to prevent restarts
let currentPlayingStatus = ref<string | null>(null)

// Watch for game starting to fade out splash music (online games)
watch(() => onlineGame.gameStarting.value, async (isStarting) => {
  if (!isStarting || isMuted.value) return

  // Fade out splash music over 500ms
  let currentVolume = 0.5
  const fadeSteps = 10
  const fadeInterval = 50 // 50ms * 10 = 500ms
  const volumeStep = 0.5 / fadeSteps

  for (let i = 0; i < fadeSteps; i++) {
    currentVolume -= volumeStep
    if (isIOS && isCapacitor) {
      // iOS - Use NativeAudio
      try {
        await NativeAudio.setVolume({
          assetId: SPLASH_AUDIO_ID,
          volume: Math.max(0, currentVolume)
        })
      } catch (error) {
        break
      }
    } else {
      // Android - Use HTML5 Audio
      if (splashAudio) {
        splashAudio.volume = Math.max(0, currentVolume)
      }
    }
    await new Promise(resolve => setTimeout(resolve, fadeInterval))
  }
})

// Watch for game status changes to switch music
watch(gameStatus, async (newStatus, oldStatus) => {
  // Prevent re-triggering if status hasn't actually changed
  if (newStatus === oldStatus) return
  if (isMuted.value) return

  if (isIOS && isCapacitor) {
    // iOS - Use NativeAudio
    try {
      if (newStatus === 'playing') {
        currentPlayingStatus.value = 'playing'
        console.log('iOS: Switching to game music')
        await NativeAudio.stop({ assetId: SPLASH_AUDIO_ID }).catch(() => {})
        await NativeAudio.setVolume({ assetId: SPLASH_AUDIO_ID, volume: 0.5 }).catch(() => {})
        await NativeAudio.stop({ assetId: GAME_AUDIO_ID }).catch(() => {})

        // Play once to start from beginning, then loop
        console.log('iOS: Playing game music from beginning')
        await NativeAudio.play({ assetId: GAME_AUDIO_ID })
        // Wait a moment for play to start, then switch to loop mode
        setTimeout(async () => {
          await NativeAudio.stop({ assetId: GAME_AUDIO_ID }).catch(() => {})
          await NativeAudio.loop({ assetId: GAME_AUDIO_ID })
          console.log('iOS: Game music now looping')
        }, 100)
        console.log('iOS: Game music started')
      } else if (newStatus === 'finished' || newStatus === 'waiting') {
        currentPlayingStatus.value = newStatus
        console.log('iOS: Switching back to splash music')
        await NativeAudio.stop({ assetId: GAME_AUDIO_ID }).catch(() => {})
        await NativeAudio.stop({ assetId: SPLASH_AUDIO_ID }).catch(() => {})

        // Play once to start from beginning, then loop
        console.log('iOS: Playing splash music from beginning')
        await NativeAudio.play({ assetId: SPLASH_AUDIO_ID })
        // Wait a moment for play to start, then switch to loop mode
        setTimeout(async () => {
          await NativeAudio.stop({ assetId: SPLASH_AUDIO_ID }).catch(() => {})
          await NativeAudio.loop({ assetId: SPLASH_AUDIO_ID })
          console.log('iOS: Splash music now looping')
        }, 100)
        console.log('iOS: Splash music started')

        if (newStatus === 'finished') {
          setTimeout(() => {
            showEndButton.value = true
          }, 2000)
        }
      }
    } catch (error) {
      console.log('iOS music switch error:', error)
    }
  } else {
    // Android - Use HTML5 Audio
    if (newStatus === 'playing') {
      currentPlayingStatus.value = 'playing'
      splashAudio?.pause()
      if (splashAudio) splashAudio.volume = 0.5

      if (gameAudio) {
        gameAudio.currentTime = 0
        gameAudio.play()
      }
    } else if (newStatus === 'finished' || newStatus === 'waiting') {
      currentPlayingStatus.value = newStatus
      gameAudio?.pause()

      if (splashAudio) {
        splashAudio.currentTime = 0
        splashAudio.play()
      }

      if (newStatus === 'finished') {
        setTimeout(() => {
          showEndButton.value = true
        }, 2000)
      }
    }
  }
})


// Keep screen awake during gameplay
watch([isPlaying, () => classicGame.isPlaying.value], async ([battlePlaying, classicPlaying]) => {
  const isAnyGamePlaying = battlePlaying || classicPlaying

  try {
    if (isAnyGamePlaying) {
      await KeepAwake.keepAwake()
      console.log('📱 Screen will stay awake during gameplay')
    } else {
      await KeepAwake.allowSleep()
      console.log('📱 Screen sleep allowed')
    }
  } catch (error) {
    console.log('Keep awake error:', error)
  }
})

// Watch for Classic Sudoku game status changes to switch music
watch([() => classicGame.isPlaying.value, () => classicGame.isCompleted.value], async ([isPlaying, isCompleted]) => {
  // Only apply music changes when in Classic mode
  if (gameMode.value !== 'classic') return
  if (isMuted.value) return

  if (isIOS && isCapacitor) {
    // iOS - Use NativeAudio
    try {
      if (isPlaying && !isCompleted) {
        // Switch to game music (downbeat jazz)
        console.log('iOS Classic: Switching to game music')
        await NativeAudio.stop({ assetId: SPLASH_AUDIO_ID }).catch(() => {})
        await NativeAudio.setVolume({ assetId: SPLASH_AUDIO_ID, volume: 0.5 }).catch(() => {})
        await NativeAudio.stop({ assetId: GAME_AUDIO_ID }).catch(() => {})

        // Play once to start from beginning, then loop
        await NativeAudio.play({ assetId: GAME_AUDIO_ID })
        setTimeout(async () => {
          await NativeAudio.stop({ assetId: GAME_AUDIO_ID }).catch(() => {})
          await NativeAudio.loop({ assetId: GAME_AUDIO_ID })
        }, 100)
      } else if (!isPlaying || isCompleted) {
        // Switch back to splash music (upbeat jazz)
        console.log('iOS Classic: Switching back to splash music')
        await NativeAudio.stop({ assetId: GAME_AUDIO_ID }).catch(() => {})
        await NativeAudio.stop({ assetId: SPLASH_AUDIO_ID }).catch(() => {})

        // Play once to start from beginning, then loop
        await NativeAudio.play({ assetId: SPLASH_AUDIO_ID })
        setTimeout(async () => {
          await NativeAudio.stop({ assetId: SPLASH_AUDIO_ID }).catch(() => {})
          await NativeAudio.loop({ assetId: SPLASH_AUDIO_ID })
        }, 100)
      }
    } catch (error) {
      console.log('iOS Classic music switch error:', error)
    }
  } else {
    // Android - Use HTML5 Audio
    if (isPlaying && !isCompleted) {
      // Switch to game music (downbeat jazz)
      splashAudio?.pause()
      if (splashAudio) splashAudio.volume = 0.5

      if (gameAudio) {
        gameAudio.currentTime = 0
        gameAudio.play()
      }
    } else if (!isPlaying || isCompleted) {
      // Switch back to splash music (upbeat jazz)
      gameAudio?.pause()

      if (splashAudio) {
        splashAudio.currentTime = 0
        splashAudio.play()
      }
    }
  }
})
</script>

<template>
  <!-- Splash Screen -->
  <div
    v-if="showSplash"
    class="fixed inset-0 bg-white flex items-center justify-center z-50 transition-opacity duration-500"
    :class="showSplash ? 'opacity-100' : 'opacity-0'"
  >
    <img
      src="/assets/FullSplash.png"
      alt="Multiplayer Sudoku Splash"
      class="object-contain w-full h-full p-4"
      style="max-width: 100%; max-height: 100%;"
    />
  </div>

  <!-- Game Mode Selector (show after splash, before game) -->
  <GameModeSelector
    v-if="!showSplash && !gameModeSelected && !showClassicDifficulty"
    @select-mode="handleGameModeSelect"
  />

  <!-- Classic Difficulty Selector (show after selecting Classic mode) -->
  <ClassicDifficultySelector
    v-if="!showSplash && !gameModeSelected && showClassicDifficulty"
    @select-difficulty="handleClassicDifficultySelect"
    @back="handleBackFromDifficulty"
    @show-help="showHelp = true"
  />

  <!-- Top Bar Buttons (only show on home page, not during Classic game) -->
  <div v-if="!showSplash && gameModeSelected && !isPlaying && !isFinished && !classicGame.isPlaying.value" class="fixed top-[54px] left-[19px] z-50 flex gap-2">
    <!-- Leaderboard Button -->
    <button
      @click="showLeaderboard = true"
      class="bg-white/90 hover:bg-white text-gray-800 font-bold p-3 rounded-full shadow-lg transition-all hover:scale-110"
      title="Leaderboard"
    >
      <span class="text-2xl">🏆</span>
    </button>

    <!-- Profile / Sign In Button -->
    <button
      v-if="auth.isAuthenticated.value"
      @click="showProfileDropdown = !showProfileDropdown"
      class="bg-white/90 hover:bg-white text-gray-800 font-bold p-3 rounded-full shadow-lg transition-all hover:scale-110"
      title="Profile"
    >
      <span class="text-2xl">👤</span>
    </button>
    <button
      v-else
      @click="showAuthModal = true"
      class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-full shadow-lg transition-all hover:scale-105 text-sm"
      title="Sign In"
    >
      Sign In
    </button>
  </div>

  <!-- Help Button (only show on home page, not during Classic game) -->
  <button
    v-if="!showSplash && gameModeSelected && !isPlaying && !isFinished && !classicGame.isPlaying.value"
    @click="showHelp = true"
    class="fixed top-[54px] right-20 z-50 bg-white/90 hover:bg-white text-gray-800 font-bold p-3 rounded-full shadow-lg transition-all hover:scale-110"
    title="Help & Rules"
  >
    <span class="text-2xl">❓</span>
  </button>

  <!-- Music Control Button (only show on home page, not during Classic game) -->
  <button
    v-if="!showSplash && gameModeSelected && !isPlaying && !isFinished && !classicGame.isPlaying.value"
    @click="toggleMute"
    class="fixed top-[54px] right-[19px] z-50 bg-white/90 hover:bg-white text-gray-800 font-bold p-3 rounded-full shadow-lg transition-all hover:scale-110"
    :title="isMuted ? 'Unmute Music' : 'Mute Music'"
  >
    <span v-if="isMuted" class="text-2xl">🔇</span>
    <span v-else class="text-2xl">🔊</span>
  </button>

  <!-- Profile Dropdown -->
  <div
    v-if="showProfileDropdown && auth.profile.value"
    class="fixed inset-0 z-[70]"
  >
    <div class="absolute inset-0" @click="showProfileDropdown = false"></div>
    <div class="absolute top-[118px] left-[5vw] right-[5vw]">
      <UserProfile
        :profile="auth.profile.value"
        :stats="userStats.stats.value"
        @update-username="handleUpdateUsername"
        @sign-out="handleSignOut"
        @close="showProfileDropdown = false"
      />
    </div>
  </div>

  <!-- Main Game (only show when mode is selected) -->
  <div v-if="!showSplash && gameModeSelected" class="h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-[5vw] py-4 overflow-y-hidden">
    <div class="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full relative z-[60] game-panel-container">
      <!-- Transparent overlay to block card interactions when a panel is open -->
      <div v-if="showLeaderboard || showProfileDropdown || showHelp" class="absolute inset-0 rounded-lg z-10"></div>
      <!-- Connection Status - top left during gameplay only (Battle mode only) -->
      <div v-if="gameMode !== 'classic' && isPlaying && !isFinished" class="absolute top-[42px] left-[47px] flex items-center gap-2">
        <span class="relative flex h-2 w-2">
          <span v-if="connectionStatus === 'connected'"
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2"
                :class="{
                  'bg-green-500': connectionStatus === 'connected',
                  'bg-red-500': connectionStatus === 'disconnected' || connectionStatus === 'error',
                  'bg-yellow-500': connectionStatus === 'reconnecting'
                }"></span>
        </span>
        <span class="text-xs font-medium" :class="{
          'text-green-700': connectionStatus === 'connected',
          'text-red-700': connectionStatus === 'disconnected' || connectionStatus === 'error',
          'text-yellow-700': connectionStatus === 'reconnecting'
        }">
          {{ connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'reconnecting' ? `Reconnecting${connectionAttempts > 0 ? ` (${connectionAttempts})` : ''}...` :
             connectionStatus === 'error' ? 'Connection Error' :
             'Disconnected' }}
        </span>
      </div>

      <!-- Music Control Button (during gameplay) -->
      <button
        v-if="isPlaying || classicGame.isPlaying.value"
        @click="toggleMute"
        class="absolute top-[30px] right-16 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center"
        :title="isMuted ? 'Unmute Music' : 'Mute Music'"
      >
        <span v-if="isMuted" class="text-xl">🔇</span>
        <span v-else class="text-xl">🔊</span>
      </button>

      <!-- Leave Game Button (top-right corner X) -->
      <button
        v-if="isPlaying || classicGame.isPlaying.value"
        @click="handleLeaveGame"
        class="absolute top-[30px] right-4 w-10 h-10 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center"
        title="Leave Game"
      >
        ✕
      </button>

      <!-- Title - only show when NOT playing -->
      <h1 v-if="!(isPlaying || classicGame.isPlaying.value)" class="text-3xl font-bold text-gray-800 mb-2 text-center">
        {{ gameMode === 'classic' ? 'Classic Sudoku' : 'Sudoku Battle' }}
      </h1>

      <div class="space-y-6" :class="{ 'mt-14': isPlaying || classicGame.isPlaying.value }">
        <!-- Classic Sudoku Game View -->
        <div v-if="gameMode === 'classic' && (classicGame.isPlaying.value || classicGame.isCompleted.value)">
          <!-- Game Stats -->
          <div v-if="!classicGame.isCompleted.value" class="flex justify-center items-center mb-4 p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg gap-8">
            <div class="text-center">
              <p class="text-xs font-semibold text-gray-600 uppercase">Difficulty</p>
              <p class="text-lg font-bold text-purple-700 capitalize">{{ classicGame.difficulty.value }}</p>
            </div>
            <div class="text-center">
              <p class="text-xs font-semibold text-gray-600 uppercase">Time</p>
              <p class="text-lg font-bold text-blue-700">{{ Math.floor(classicGame.elapsedTime.value / 60) }}:{{ (classicGame.elapsedTime.value % 60).toString().padStart(2, '0') }}</p>
            </div>
          </div>

          <!-- Sudoku Board with Notes -->
          <SudokuBoard
            v-if="!classicGame.isCompleted.value"
            :board="classicGame.board.value"
            :is-my-turn="true"
            :players="[]"
            :is-finished="classicGame.isCompleted.value"
            :enable-notes="true"
            :can-undo="classicGame.canUndo.value"
            @make-move="(row, col, value) => classicGame.makeMove(row, col, value)"
            @toggle-note="(row, col, note) => classicGame.toggleNote(row, col, note)"
            @undo="classicGame.undo()"
            @reset-board="classicGame.resetBoard()"
          />

          <!-- Completion Screen -->
          <div v-if="classicGame.isCompleted.value" class="mt-4 p-6 bg-gradient-to-r from-green-100 to-emerald-200 rounded-lg border-2 border-green-400">
            <div class="animate-fade-in text-center">
              <h2 class="text-3xl font-bold mb-3">🎉 Puzzle Solved!</h2>
              <p class="text-lg text-gray-700 mb-4">Congratulations! You completed the puzzle.</p>

              <div class="flex justify-center gap-6 mb-4">
                <div class="text-center">
                  <p class="text-xs font-semibold text-gray-600 uppercase">Time</p>
                  <p class="text-2xl font-bold text-blue-600">
                    {{ Math.floor(classicGame.elapsedTime.value / 60) }}:{{ (classicGame.elapsedTime.value % 60).toString().padStart(2, '0') }}
                  </p>
                </div>
                <div class="text-center">
                  <p class="text-xs font-semibold text-gray-600 uppercase">Difficulty</p>
                  <p class="text-2xl font-bold text-purple-600 capitalize">{{ classicGame.difficulty.value }}</p>
                </div>
              </div>

              <button
                @click="handleLeaveGame"
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>

        <!-- Connection Status - desktop version (always visible) and home page -->
        <div v-if="gameMode !== 'classic'" class="connection-status-desktop flex items-center justify-between p-3 rounded-lg"
             :class="{
               'bg-green-100': connectionStatus === 'connected',
               'bg-red-100': connectionStatus === 'disconnected' || connectionStatus === 'error',
               'bg-yellow-100': connectionStatus === 'reconnecting'
             }">
          <span class="font-semibold text-sm" :class="{
            'text-green-800': connectionStatus === 'connected',
            'text-red-800': connectionStatus === 'disconnected' || connectionStatus === 'error',
            'text-yellow-800': connectionStatus === 'reconnecting'
          }">
            Connection:
          </span>
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span v-if="connectionStatus === 'connected'"
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span v-else-if="connectionStatus === 'reconnecting'"
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2"
                    :class="{
                      'bg-green-500': connectionStatus === 'connected',
                      'bg-red-500': connectionStatus === 'disconnected' || connectionStatus === 'error',
                      'bg-yellow-500': connectionStatus === 'reconnecting'
                    }"></span>
            </span>
            <span class="font-bold text-sm" :class="{
              'text-green-800': connectionStatus === 'connected',
              'text-red-800': connectionStatus === 'disconnected' || connectionStatus === 'error',
              'text-yellow-800': connectionStatus === 'reconnecting'
            }">
              {{ connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'reconnecting' ? `Reconnecting${connectionAttempts > 0 ? ` (${connectionAttempts})` : ''}...` :
                 connectionStatus === 'error' ? 'Connection Error' :
                 'Disconnected' }}
            </span>
          </div>
        </div>

        <!-- Error Message (only show on home page, not on board) -->
        <div v-if="gameMode !== 'classic' && onlineGame.error.value && !isPlaying && !isFinished" class="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <p class="text-red-700 font-medium mb-3">{{ onlineGame.error.value }}</p>
          <button
            @click="handleForceReset"
            class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            🔄 Force Reset & Start Fresh
          </button>
        </div>

        <!-- Player Lobby (online player list) - Battle mode, before entering a room -->
        <PlayerLobby
          v-if="showPlayerLobby && gameMode !== 'classic' && !isPlaying && !isFinished"
          :lobby-players="onlineGame.lobbyPlayers.value"
          :lobby-total="onlineGame.lobbyTotal.value"
          :is-connected="isConnected"
          :authenticated-user-id="auth.user.value?.id || null"
          :authenticated-username="auth.profile.value?.username || null"
          :outgoing-challenge="onlineGame.outgoingChallenge.value"
          :challenge-error="onlineGame.challengeError.value"
          @create-room="handlePlayerLobbyCreateRoom"
          @join-room="handlePlayerLobbyJoinRoom"
          @create-a-i-game="handlePlayerLobbyCreateAIGame"
          @back="handlePlayerLobbyBack"
          @show-auth="showAuthModal = true"
          @set-idle="onlineGame.setLobbyIdle()"
          @set-available="onlineGame.setLobbyAvailable()"
          @challenge="onlineGame.sendChallenge($event)"
          @cancel-challenge="onlineGame.cancelChallenge($event)"
        />

        <!-- Game Lobby (before game starts) - only for Battle mode, not when in Player Lobby -->
        <GameLobby
          v-if="!showPlayerLobby && gameMode !== 'classic' && !isPlaying && !isFinished"
          :room-code="onlineGame.roomCode.value"
          :players="players"
          :is-waiting="isWaiting"
          :game-starting="onlineGame.gameStarting.value"
          :is-connected="isConnected"
          :authenticated-username="auth.profile.value?.username || null"
          @create-room="handleCreateRoom"
          @createAIGame="handleCreateAIGame"
          @createOfflineGame="handleCreateOfflineGame"
          @join-room="handleJoinRoom"
          @show-auth="showAuthModal = true"
          @return-to-mode-selection="gameModeSelected = false"
          @cancel-room="handleEndGame"
        />

        <!-- Game Board (when playing or finished) - Battle mode only -->
        <div v-else-if="gameMode !== 'classic' && (isPlaying || isFinished)">
          <!-- Network Lag Warning (only in online mode) -->
          <div v-if="gameMode === 'online' && isPlaying && isSlowConnection" class="mb-2 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
            <p class="text-sm text-orange-800 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>Slow network detected - moves may take longer to process</span>
            </p>
          </div>

          <!-- Connection Issue Alert (during game) -->
          <div v-if="gameMode === 'online' && isPlaying && (connectionStatus === 'reconnecting' || connectionStatus === 'error')" class="mb-2 p-3 bg-red-50 border-l-4 border-red-500 rounded animate-pulse">
            <p class="text-sm text-red-800 font-semibold flex items-center gap-2">
              <span>🔌</span>
              <span v-if="connectionStatus === 'reconnecting'">Connection lost - Reconnecting{{ connectionAttempts > 0 ? ` (attempt ${connectionAttempts})` : '' }}...</span>
              <span v-else>Connection error - Please check your internet</span>
            </p>
          </div>

          <!-- Turn Status Container (fixed height to prevent jumping) -->
          <div class="h-[64px]">
            <!-- Move Status Indicator -->
            <div v-if="gameMode === 'online' && isPlaying && moveStatus === 'submitting'" class="mb-2 p-2 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p class="text-sm text-blue-800 font-semibold flex items-center gap-2">
                <span class="animate-spin">⏳</span>
                <span>Submitting move...</span>
              </p>
            </div>

            <!-- Turn Status: Your Turn -->
            <div v-if="gameMode === 'online' && isPlaying && isMyTurn && moveStatus === 'idle'" class="mb-2 p-2 bg-green-50 border-l-4 border-green-500 rounded">
              <p class="text-sm text-green-800 font-semibold flex items-center gap-2">
                <span>✋</span>
                <span>Your turn - Make your move!</span>
              </p>
            </div>

            <!-- Turn Status: Waiting for Opponent -->
            <div v-if="gameMode === 'online' && isPlaying && !isMyTurn && moveStatus === 'idle'" class="mb-2 p-2 bg-purple-50 border-l-4 border-purple-500 rounded">
              <p class="text-sm text-purple-800 font-semibold flex items-center gap-2">
                <span>👀</span>
                <span>Waiting for opponent to finish their turn...</span>
              </p>
            </div>
          </div>

          <!-- Game Tracking Indicator -->
          <div v-if="isPlaying && players.length === 2" class="mb-2 flex justify-center">
            <div
              class="text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1"
              :class="isTrackedGame ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
            >
              <span>{{ isTrackedGame ? '🔒 Tracked Game' : '👥 Practice Game' }}</span>
            </div>
          </div>

          <!-- Player Scores with Timers -->
          <div v-if="players.length > 0" class="mb-4 flex gap-3">
            <div
              v-if="!isFinished"
              v-for="player in players"
              :key="player.id"
              class="flex-1 p-3 rounded-lg transition-all ring-2 ring-offset-2"
              :style="{ backgroundColor: player.colorScheme.bgHex }"
              :class="[
                currentTurn === player.id ? 'ring-blue-400' : 'ring-transparent',
                flashingPlayerId === player.id ? 'flash-player-card' : ''
              ]"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  :style="{ backgroundColor: player.colorScheme.bgDarkHex, color: player.colorScheme.textHex }"
                >
                  <span>{{ player.name.charAt(0).toUpperCase() }}</span>
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-sm" :style="{ color: player.colorScheme.textHex }">{{ player.name }}</p>
                  <p class="text-xs opacity-90" :style="{ color: player.colorScheme.textHex }">{{ scores[player.id] || 0 }} cells locked</p>
                </div>

                <!-- Timer (always reserve space, only visible when it's this player's turn) -->
                <div
                  class="text-2xl font-bold font-mono px-3 py-1 rounded transition-colors w-16 text-center"
                  :class="[
                    isPlaying && currentTurn === player.id ? (remainingTime <= 5 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-white bg-opacity-30') : 'opacity-0'
                  ]"
                  :style="isPlaying && currentTurn === player.id && remainingTime > 5 ? { color: player.colorScheme.textHex } : {}"
                >
                  <span v-if="isPlaying && currentTurn === player.id">{{ remainingTime }}s</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Opponent Disconnected Overlay -->
          <div
            v-if="gameMode === 'online' && isPlaying && onlineGame.opponentDisconnected.value"
            class="relative z-10 mb-2 p-5 bg-gray-900/80 rounded-xl text-center backdrop-blur-sm border border-gray-600"
          >
            <div class="text-3xl mb-2">📡</div>
            <p class="font-bold text-white mb-1">Opponent Disconnected</p>
            <p class="text-sm text-gray-300 mb-3">Waiting for them to reconnect…</p>
            <p
              class="text-4xl font-mono font-bold transition-colors"
              :class="reconnectSecondsLeft <= 20 ? 'text-red-400 animate-pulse' : 'text-blue-300'"
            >{{ reconnectSecondsLeft }}s</p>
            <p class="text-xs text-gray-400 mt-1">Game forfeited if they don't return</p>
          </div>

          <!-- Sudoku Board -->
          <SudokuBoard
            v-if="!isFinished"
            :board="board"
            :is-my-turn="isMyTurn && !onlineGame.opponentDisconnected.value"
            :revealed-cell="revealedCell"
            :last-locked-cell="lastLockedCell"
            :players="players"
            :is-finished="isFinished"
            @make-move="handleMakeMove"
          />

          <!-- Game End Screen -->
          <div v-if="isFinished" class="mt-4 p-6 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg border-2 border-yellow-400 game-end-screen">
            <div class="animate-fade-in">
              <h2 class="text-3xl font-bold text-center mb-3">
                {{ winner ? (winner.id === myPlayerId ? '🎉 You Win!' : '😔 You Lose') : "🤝 It's a Tie!" }}
              </h2>

              <!-- Forfeit Message -->
              <div v-if="onlineGame.forfeit.value" class="mb-3 p-3 bg-orange-100 border-l-4 border-orange-500 rounded">
                <p class="text-sm text-orange-800 font-semibold text-center">
                  {{ onlineGame.forfeitedPlayerId.value === myPlayerId ? 'You were disconnected too long and forfeited.' : 'Opponent forfeited due to disconnection.' }}
                </p>
              </div>

              <!-- Early Win Message -->
              <div v-if="earlyWin && !onlineGame.forfeit.value" class="mb-3 p-3 bg-purple-100 border-l-4 border-purple-500 rounded">
                <p class="text-sm text-purple-800 font-semibold text-center">
                  ⚡ Dominant Victory! The winner had an insurmountable lead.
                </p>
              </div>

              <div class="text-center mb-4">
                <p class="text-sm text-gray-700 mb-2">Final Scores:</p>
                <div class="flex justify-center gap-4">
                  <div v-for="player in players" :key="player.id" class="text-center">
                    <p class="font-semibold">{{ player.name }}</p>
                    <p class="text-2xl font-bold text-blue-600">{{ scores[player.id] || 0 }}</p>
                  </div>
                </div>
              </div>

              <!-- End Button -->
              <div class="text-center mt-4">
                <button
                  @click="handleEndGame"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
                >
                  {{ gameMode === 'online' ? 'Return to Lobby' : 'End Game' }}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>

  <!-- Incoming Challenge Modal -->
  <ChallengeModal
    v-if="onlineGame.incomingChallenge.value"
    :challenge="onlineGame.incomingChallenge.value"
    @accept="onlineGame.acceptChallenge($event)"
    @decline="onlineGame.declineChallenge($event)"
  />

  <!-- Help Modal -->
  <HelpModal
    :is-open="showHelp"
    :mode="gameMode === 'classic' || showClassicDifficulty ? 'classic' : 'battle'"
    :default-tab="helpDefaultTab"
    @close="showHelp = false; helpDefaultTab = undefined"
  />

  <!-- Auth Modal -->
  <AuthModal
    ref="authModalRef"
    :is-open="showAuthModal"
    @close="showAuthModal = false"
    @sign-in="handleSignIn"
    @verify-code="handleVerifyCode"
  />

  <!-- Leaderboard -->
  <Leaderboard
    :is-open="showLeaderboard"
    :current-user-id="auth.user.value?.id"
    @close="showLeaderboard = false"
    @show-rating-help="showLeaderboard = false; helpDefaultTab = 'rating'; showHelp = true"
  />
</template>

<style>
/* Global styles - disable scrolling */
body {
  overflow: hidden !important;
  height: 100vh;
  position: fixed;
  width: 100%;
}
</style>

<style scoped>
/* Flash effect for player card when turn changes */
@keyframes flashCard {
  0% {
    box-shadow: inset 0 0 0 1000px rgba(255, 255, 255, 1);
  }
  100% {
    box-shadow: inset 0 0 0 1000px rgba(255, 255, 255, 0);
  }
}

.flash-player-card {
  animation: flashCard 0.5s ease-out;
}

/* Responsive vertical centering for game panel */
.game-panel-container {
  margin-top: 0;
}

/* Connection status - mobile: hide desktop panel and show compact centered version during game */
.connection-status-mobile {
  display: none;
}

@media (max-width: 768px) {
  .connection-status-mobile {
    display: flex;
  }

  .connection-status-desktop {
    display: none;
  }
}

/* Stack player cards vertically on mobile and match board width */
@media (max-width: 768px) {
  .mb-4.flex.gap-3 {
    flex-direction: column;
    gap: 0.5rem; /* Small gap between stacked cards */
    width: calc(95vw - 33px); /* Match board width */
    max-width: calc(95vw - 33px);
    margin-left: -20px;
    margin-right: auto;
  }

  .mb-4.flex.gap-3 > div {
    padding: 0.5rem !important; /* Reduced padding */
    width: 100%; /* Full width of container */
    flex: none; /* Don't grow/shrink */
  }

  .mb-4.flex.gap-3 > div .flex.items-center.gap-2 {
    gap: 0.375rem;
  }

  .mb-4.flex.gap-3 > div .w-8.h-8 {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.75rem;
  }

  .mb-4.flex.gap-3 > div .font-semibold {
    font-size: 0.813rem;
  }

  .mb-4.flex.gap-3 > div .text-xs {
    font-size: 0.688rem;
  }

  .mb-4.flex.gap-3 > div .w-16 {
    width: 3.5rem;
    font-size: 1.125rem;
    padding: 0.25rem 0.5rem;
  }
}

/* Fade-in animation for game end screen */
@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 1s ease-out;
}

.game-end-screen {
  animation: fadeIn 0.5s ease-out;
}
</style>
