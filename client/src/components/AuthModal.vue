<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  signIn: [email: string, username: string]
  verifyCode: [email: string, code: string]
}>()

const email = ref('')
const username = ref('')
const code = ref('')
const step = ref<'email' | 'code'>('email')
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const loading = ref(false)

const handleSendCode = async () => {
  if (!email.value.trim() || !email.value.includes('@')) {
    error.value = 'Please enter a valid email address'
    return
  }

  if (!username.value.trim() || username.value.trim().length < 2) {
    error.value = 'Please enter a username (at least 2 characters)'
    return
  }

  loading.value = true
  error.value = null
  success.value = null

  emit('signIn', email.value.trim(), username.value.trim())
}

const handleVerifyCode = async () => {
  if (!code.value.trim() || code.value.length !== 8) {
    error.value = 'Please enter the 8-digit code from your email'
    return
  }

  loading.value = true
  error.value = null

  emit('verifyCode', email.value.trim(), code.value.trim())
}

const resetForm = () => {
  email.value = ''
  username.value = ''
  code.value = ''
  step.value = 'email'
  error.value = null
  success.value = null
  loading.value = false
}

const closeModal = () => {
  resetForm()
  emit('close')
}

// Expose methods for parent to call
defineExpose({
  showCodeStep: () => {
    step.value = 'code'
    success.value = 'Check your email for the 8-digit verification code!'
    loading.value = false
  },
  showError: (message: string) => {
    error.value = message
    loading.value = false
  },
  showSuccess: () => {
    success.value = 'Successfully signed in!'
    setTimeout(() => {
      closeModal()
    }, 1500)
  }
})
</script>

<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="closeModal"></div>

      <!-- Modal -->
      <div class="relative bg-white rounded-lg shadow-2xl max-w-md w-full p-6 z-10">
        <!-- Close Button -->
        <button
          @click="closeModal"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span class="text-2xl">×</span>
        </button>

        <!-- Header -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            {{ step === 'email' ? 'Sign In' : 'Verify Code' }}
          </h2>
          <p class="text-sm text-gray-600">
            {{ step === 'email'
              ? 'Enter your email and choose a player name'
              : 'Enter the 8-digit code sent to your email' }}
          </p>
        </div>

        <!-- Email Step -->
        <div v-if="step === 'email'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              v-model="email"
              type="email"
              placeholder="your@email.com"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :disabled="loading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Player Name
            </label>
            <input
              v-model="username"
              type="text"
              placeholder="Enter your player name"
              maxlength="30"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keyup.enter="handleSendCode"
              :disabled="loading"
            />
          </div>

          <button
            @click="handleSendCode"
            :disabled="loading || !email.trim() || !username.trim()"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {{ loading ? 'Sending...' : 'Send Verification Code' }}
          </button>
        </div>

        <!-- Code Verification Step -->
        <div v-else class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              v-model="code"
              type="text"
              placeholder="12345678"
              maxlength="8"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
              @keyup.enter="handleVerifyCode"
              :disabled="loading"
            />
          </div>

          <button
            @click="handleVerifyCode"
            :disabled="loading || code.length !== 8"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {{ loading ? 'Verifying...' : 'Verify & Sign In' }}
          </button>

          <button
            @click="step = 'email'"
            :disabled="loading"
            class="w-full text-sm text-blue-600 hover:text-blue-700 underline"
          >
            ← Back to email
          </button>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>

        <!-- Success Message -->
        <div v-if="success" class="mt-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
          <p class="text-sm text-green-700">{{ success }}</p>
        </div>

        <!-- Info Message -->
        <div class="mt-6 p-3 bg-blue-50 rounded-lg">
          <p class="text-xs text-blue-800">
            <strong>Note:</strong> We use passwordless authentication for security.
            Check your email for the 8-digit verification code. It may take a minute to arrive.
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>
