import { ColorScheme } from '../../../shared/types.js';

// Predefined color schemes for players - vibrant colored backgrounds with white text
export const COLOR_SCHEMES: ColorScheme[] = [
  {
    primary: 'blue',
    bg: 'bg-blue-500',
    bgDark: 'bg-blue-600',
    text: 'text-white',
    textDark: 'text-white',
    ring: 'ring-blue-500',
    border: 'border-blue-500',
    bgHex: '#3b82f6',
    bgDarkHex: '#2563eb',
    textHex: '#ffffff'
  },
  {
    primary: 'purple',
    bg: 'bg-purple-500',
    bgDark: 'bg-purple-600',
    text: 'text-white',
    textDark: 'text-white',
    ring: 'ring-purple-500',
    border: 'border-purple-500',
    bgHex: '#a855f7',
    bgDarkHex: '#9333ea',
    textHex: '#ffffff'
  },
  {
    primary: 'pink',
    bg: 'bg-pink-500',
    bgDark: 'bg-pink-600',
    text: 'text-white',
    textDark: 'text-white',
    ring: 'ring-pink-500',
    border: 'border-pink-500',
    bgHex: '#ec4899',
    bgDarkHex: '#db2777',
    textHex: '#ffffff'
  },
  {
    primary: 'teal',
    bg: 'bg-teal-500',
    bgDark: 'bg-teal-600',
    text: 'text-white',
    textDark: 'text-white',
    ring: 'ring-teal-500',
    border: 'border-teal-500',
    bgHex: '#14b8a6',
    bgDarkHex: '#0d9488',
    textHex: '#ffffff'
  },
  {
    primary: 'orange',
    bg: 'bg-orange-500',
    bgDark: 'bg-orange-600',
    text: 'text-white',
    textDark: 'text-white',
    ring: 'ring-orange-500',
    border: 'border-orange-500',
    bgHex: '#f97316',
    bgDarkHex: '#ea580c',
    textHex: '#ffffff'
  },
  {
    primary: 'emerald',
    bg: 'bg-emerald-500',
    bgDark: 'bg-emerald-600',
    text: 'text-white',
    textDark: 'text-white',
    ring: 'ring-emerald-500',
    border: 'border-emerald-500',
    bgHex: '#10b981',
    bgDarkHex: '#059669',
    textHex: '#ffffff'
  },
  {
    primary: 'rose',
    bg: 'bg-rose-500',
    bgDark: 'bg-rose-600',
    text: 'text-white',
    textDark: 'text-white',
    ring: 'ring-rose-500',
    border: 'border-rose-500',
    bgHex: '#f43f5e',
    bgDarkHex: '#e11d48',
    textHex: '#ffffff'
  },
  {
    primary: 'amber',
    bg: 'bg-amber-500',
    bgDark: 'bg-amber-600',
    text: 'text-white',
    textDark: 'text-white',
    ring: 'ring-amber-500',
    border: 'border-amber-500',
    bgHex: '#f59e0b',
    bgDarkHex: '#d97706',
    textHex: '#ffffff'
  }
];

// Used color schemes tracker (per room)
const usedColorSchemes = new Map<string, Set<number>>();

/**
 * Get a random unused color scheme for a room
 * @param roomId - The room ID
 * @returns A color scheme that hasn't been used in this room yet
 */
export function getRandomColorScheme(roomId: string): ColorScheme {
  // Initialize used colors for this room if not exists
  if (!usedColorSchemes.has(roomId)) {
    usedColorSchemes.set(roomId, new Set());
  }

  const usedIndices = usedColorSchemes.get(roomId)!;

  // Find available color schemes
  const availableIndices = COLOR_SCHEMES.map((_, i) => i).filter(i => !usedIndices.has(i));

  // If all colors are used, reset
  if (availableIndices.length === 0) {
    usedIndices.clear();
    availableIndices.push(...COLOR_SCHEMES.map((_, i) => i));
  }

  // Pick random from available
  const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  usedIndices.add(randomIndex);

  const selectedScheme = COLOR_SCHEMES[randomIndex];
  console.log(`Room ${roomId}: Assigned color ${selectedScheme.primary} (index ${randomIndex}). Used indices:`, Array.from(usedIndices));

  return selectedScheme;
}

/**
 * Clear used color schemes for a room (when room is deleted)
 * @param roomId - The room ID
 */
export function clearRoomColors(roomId: string): void {
  usedColorSchemes.delete(roomId);
}
