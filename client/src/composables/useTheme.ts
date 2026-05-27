import { ref } from 'vue'
import { Preferences } from '@capacitor/preferences'

export type ThemeName = 'slate-violet' | 'charcoal-cyan' | 'deep-blue-gold' | 'midnight-rose'

export const THEMES: { name: ThemeName; label: string; primary: string; secondary: string; accent: string; base: string }[] = [
  { name: 'slate-violet',   label: 'Slate & Violet',  primary: '#8b5cf6', secondary: '#22d3ee', accent: '#f59e0b', base: '#0f172a' },
  { name: 'charcoal-cyan',  label: 'Charcoal & Cyan', primary: '#06b6d4', secondary: '#fb923c', accent: '#a78bfa', base: '#111827' },
  { name: 'deep-blue-gold', label: 'Deep Blue & Gold', primary: '#fbbf24', secondary: '#c084fc', accent: '#60a5fa', base: '#0c1445' },
  { name: 'midnight-rose',  label: 'Midnight & Rose', primary: '#f43f5e', secondary: '#38bdf8', accent: '#818cf8', base: '#09090b' },
]

const STORAGE_KEY = 'app-theme'
const DEFAULT_THEME: ThemeName = 'slate-violet'

const currentTheme = ref<ThemeName>(DEFAULT_THEME)

function applyTheme(name: ThemeName) {
  document.documentElement.dataset.theme = name
  currentTheme.value = name
}

async function setTheme(name: ThemeName) {
  applyTheme(name)
  await Preferences.set({ key: STORAGE_KEY, value: name })
}

async function loadTheme() {
  const { value } = await Preferences.get({ key: STORAGE_KEY })
  const saved = THEMES.find(t => t.name === value)
  applyTheme(saved ? saved.name : DEFAULT_THEME)
}

export function useTheme() {
  return { currentTheme, setTheme, loadTheme, THEMES }
}
