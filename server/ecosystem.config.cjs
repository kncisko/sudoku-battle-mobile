module.exports = {
  apps: [{
    name: 'sudoku-battle',
    script: 'dist/server/src/index.js',
    env: {
      SUPABASE_URL: 'https://edmqepgmcuwutfgxpdso.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbXFlcGdtY3V3dXRmZ3hwZHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA0MzI5MSwiZXhwIjoyMDgwNjE5MjkxfQ.uwyCHXcwCRaf1kdXD7P0nkRhiTaicSptFChMPuNXVoA'
    }
  }]
}
