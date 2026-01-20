import { ref } from 'vue'
import { NativeAudio } from '@capacitor-community/native-audio'
import { Capacitor } from '@capacitor/core'

const isCapacitor = Capacitor.isNativePlatform()
const isIOS = Capacitor.getPlatform() === 'ios'
const TICK_AUDIO_ID = 'tick_sound'
const TICK_AUDIO_PATH = 'public/assets/soundfx/better-tick.mp3'

// HTML5 Audio path for Android (create new instances on each play)
const TICK_AUDIO_URL = '/assets/soundfx/better-tick.mp3'
const isInitialized = ref(false)

// Global muted state
export const tickSoundMuted = ref(false)

// Initialize tick sound
export async function initializeTickSound() {
  if (isInitialized.value) return

  if (isIOS && isCapacitor) {
    // iOS - Use NativeAudio
    try {
      await NativeAudio.preload({
        assetId: TICK_AUDIO_ID,
        assetPath: TICK_AUDIO_PATH,
        audioChannelNum: 1,
        isUrl: false,
        volume: 0.7
      })
      isInitialized.value = true
      console.log('✅ Tick sound initialized (iOS NativeAudio)')
    } catch (error) {
      console.log('iOS tick sound initialization error:', error)
    }
  } else {
    // Android or Web - Just mark as initialized
    // We'll create new Audio instances on each play
    isInitialized.value = true
    console.log('✅ Tick sound initialized (HTML5 Audio)')
  }
}

// Play tick sound
export async function playTickSound() {
  if (!isInitialized.value) {
    console.log('⚠️ Tick sound not initialized')
    return
  }

  if (tickSoundMuted.value) {
    console.log('🔇 Tick sound muted')
    return
  }

  try {
    if (isIOS && isCapacitor) {
      // iOS - Play with NativeAudio
      await NativeAudio.play({ assetId: TICK_AUDIO_ID })
    } else {
      // Android or Web - Create new Audio instance each time
      // This prevents interference with background music
      const tickAudio = new Audio(TICK_AUDIO_URL)
      tickAudio.volume = 0.5
      tickAudio.play().catch(error => {
        console.log('❌ Error playing tick sound:', error)
      })
    }
  } catch (error) {
    console.log('❌ Error playing tick sound:', error)
  }
}

// Cleanup
export async function unloadTickSound() {
  if (!isInitialized.value) return

  try {
    if (isIOS && isCapacitor) {
      await NativeAudio.unload({ assetId: TICK_AUDIO_ID })
    }
    // No cleanup needed for Android - Audio instances are garbage collected
    isInitialized.value = false
  } catch (error) {
    console.log('Error unloading tick sound:', error)
  }
}
