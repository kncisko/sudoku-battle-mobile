/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  safelist: [
    // Color scheme backgrounds
    'bg-blue-500', 'bg-blue-600',
    'bg-purple-500', 'bg-purple-600',
    'bg-pink-500', 'bg-pink-600',
    'bg-teal-500', 'bg-teal-600',
    'bg-orange-500', 'bg-orange-600',
    'bg-emerald-500', 'bg-emerald-600',
    'bg-rose-500', 'bg-rose-600',
    'bg-amber-500', 'bg-amber-600',
    // Text colors
    'text-white',
    // Rings
    'ring-blue-500', 'ring-purple-500', 'ring-pink-500', 'ring-teal-500',
    'ring-orange-500', 'ring-emerald-500', 'ring-rose-500', 'ring-amber-500',
    // Borders
    'border-blue-500', 'border-purple-500', 'border-pink-500', 'border-teal-500',
    'border-orange-500', 'border-emerald-500', 'border-rose-500', 'border-amber-500',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
