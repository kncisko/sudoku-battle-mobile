import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

// Configure mobile plugins
if (Capacitor.isNativePlatform()) {
  // Configure status bar
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => {})

  // Hide splash screen after app is loaded
  SplashScreen.hide().catch(() => {})
}

createApp(App).mount('#app')
