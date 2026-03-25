import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '../lib/supabase'

export function useAuth() {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  // Initialize auth state
  onMounted(async () => {
    // Get current session
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    session.value = currentSession
    user.value = currentSession?.user ?? null

    if (user.value) {
      await loadProfile()
    }

    loading.value = false

    // Listen for auth changes (including magic link clicks)
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth event:', event)
      session.value = newSession
      user.value = newSession?.user ?? null

      if (user.value) {
        await loadProfile()
      } else {
        profile.value = null
      }

      // If user just signed in via magic link, clean up URL
      if (event === 'SIGNED_IN' && window.location.hash) {
        // Remove the hash from URL (magic link tokens)
        window.history.replaceState(null, '', window.location.pathname)
      }
    })
  })

  // Load user profile from database
  const loadProfile = async () => {
    if (!user.value) return

    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (profileError) throw profileError
      profile.value = data
    } catch (err) {
      console.error('Error loading profile:', err)
      error.value = 'Failed to load profile'
    }
  }

  // Send OTP code to email
  const signInWithEmail = async (email: string) => {
    try {
      error.value = null
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin
        }
      })

      if (signInError) throw signInError
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to send verification code'
      return { success: false, error: error.value }
    }
  }

  // Verify OTP code
  const verifyOtp = async (email: string, token: string) => {
    try {
      error.value = null
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'  // Changed from 'magiclink' to 'email' for OTP verification
      })

      if (verifyError) throw verifyError

      user.value = data.user
      session.value = data.session

      if (user.value) {
        await loadProfile()
      }

      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Invalid or expired code'
      return { success: false, error: error.value }
    }
  }

  // Sign out
  const signOut = async () => {
    user.value = null
    session.value = null
    profile.value = null

    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // ignore network errors - local state already cleared
    }

    // Manually clear persisted Supabase session from localStorage
    // (required on Capacitor iOS where signOut doesn't always clear storage)
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key)
      }
    }

    return { success: true }
  }

  // Update username
  const updateUsername = async (username: string) => {
    if (!user.value) return { success: false, error: 'Not authenticated' }

    try {
      error.value = null
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.value.id)

      if (updateError) throw updateError

      await loadProfile()
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'Failed to update username'
      return { success: false, error: error.value }
    }
  }

  return {
    user,
    session,
    profile,
    loading,
    error,
    isAuthenticated,
    signInWithEmail,
    verifyOtp,
    signOut,
    updateUsername
  }
}
