/// <reference types="vite/client" />

// Declare module types for audio files
declare module '*.wav' {
  const src: string
  export default src
}

declare module '*.wav?url' {
  const src: string
  export default src
}
