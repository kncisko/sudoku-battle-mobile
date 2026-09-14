<template>
  <div class="h-screen flex items-center justify-center p-4" style="background-color: var(--color-base)">
    <div class="flex flex-col gap-4 w-full max-w-sm">
      <h2 class="text-3xl font-bold mb-2 text-center drop-shadow-lg" style="color: var(--color-text)">Classic Sudoku</h2>

      <button @click="$emit('select-difficulty', 'easy')" class="menu-btn" style="background-color: var(--color-primary)">
        <span class="text-3xl flex-shrink-0">😊</span>
        <div class="flex flex-col items-start">
          <span class="text-lg font-bold">Easy</span>
          <span class="text-sm opacity-80">Perfect for beginners</span>
        </div>
      </button>

      <button @click="$emit('select-difficulty', 'medium')" class="menu-btn" style="background-color: var(--color-secondary)">
        <span class="text-3xl flex-shrink-0">🎯</span>
        <div class="flex flex-col items-start">
          <span class="text-lg font-bold">Medium</span>
          <span class="text-sm opacity-80">A balanced challenge</span>
        </div>
      </button>

      <button @click="$emit('select-difficulty', 'hard')" class="menu-btn" style="background-color: var(--color-accent)">
        <span class="text-3xl flex-shrink-0">🔥</span>
        <div class="flex flex-col items-start">
          <span class="text-lg font-bold">Hard</span>
          <span class="text-sm opacity-80">For puzzle masters</span>
        </div>
      </button>

      <!-- Divider -->
      <div class="flex items-center gap-3 my-1">
        <div class="flex-1 h-px" style="background-color: var(--color-text); opacity: 0.2"></div>
        <span class="text-xs font-medium" style="color: var(--color-text); opacity: 0.5">OR</span>
        <div class="flex-1 h-px" style="background-color: var(--color-text); opacity: 0.2"></div>
      </div>

      <!-- Scan from photo -->
      <div class="flex gap-3">
        <button @click="pickPhoto('camera')" :disabled="loading" class="menu-btn flex-1" style="background-color: #6366f1;">
          <span class="text-3xl flex-shrink-0">📷</span>
          <div class="flex flex-col items-start">
            <span class="text-lg font-bold">Camera</span>
            <span class="text-sm opacity-80">Scan a puzzle</span>
          </div>
        </button>

        <button @click="pickPhoto('gallery')" :disabled="loading" class="menu-btn flex-1" style="background-color: #8b5cf6;">
          <span class="text-3xl flex-shrink-0">🖼️</span>
          <div class="flex flex-col items-start">
            <span class="text-lg font-bold">Gallery</span>
            <span class="text-sm opacity-80">Pick a photo</span>
          </div>
        </button>
      </div>

      <!-- Loading indicator -->
      <div v-if="loading" class="flex items-center justify-center gap-2 py-2">
        <div class="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
        <span class="text-sm" style="color: var(--color-text); opacity: 0.7">{{ loadingMessage }}</span>
      </div>

      <!-- Error -->
      <p v-if="photoError" class="text-red-500 text-sm text-center">{{ photoError }}</p>

      <button
        @click="$emit('back')"
        class="w-full font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-[36px]"
        style="background-color: var(--color-surface); color: var(--color-text); opacity: 0.7"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
          <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/>
        </svg>
        Back to Game Selection
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const emit = defineEmits<{
  'select-difficulty': [difficulty: 'easy' | 'medium' | 'hard']
  'scan-puzzle': [grid: number[][]]
  'back': []
}>()

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

const loading = ref(false)
const loadingMessage = ref('Loading photo...')
const photoError = ref<string | null>(null)

async function pickPhoto(source: 'camera' | 'gallery') {
  loading.value = true
  loadingMessage.value = 'Loading photo...'
  photoError.value = null
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      width: 1000,
      height: 1000,
    })

    if (!photo.dataUrl) {
      photoError.value = 'Could not load photo.'
      return
    }

    console.log('📷 Photo captured, sending to server...')
    loadingMessage.value = 'Scanning puzzle...'

    const response = await fetch(`${SERVER_URL}/scan-sudoku`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl: photo.dataUrl })
    })

    const data = await response.json()

    if (!response.ok) {
      photoError.value = data.error || 'Failed to scan puzzle.'
      console.error('Scan error:', data)
      return
    }

    console.log('✅ Grid extracted:', data.grid)
    emit('scan-puzzle', data.grid)

  } catch (err: any) {
    if (!err?.message?.includes('cancelled') && !err?.message?.includes('cancel')) {
      photoError.value = 'Failed to load photo. Please try again.'
      console.error('Camera error:', err)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.menu-btn {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.25rem;
  border-radius: 1.25rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  border: none;
  color: white;
}

.menu-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.menu-btn:active:not(:disabled) {
  filter: brightness(0.9);
}

@media (hover: hover) {
  .menu-btn:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  }
}
</style>
