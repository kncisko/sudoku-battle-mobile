import { httpServer } from './app.js';

const PORT = process.env.PORT || 3000;

// Log unhandled promise rejections instead of silently swallowing them.
// Node.js will crash on unhandled rejections by default (since v15), but
// this gives us a clear log line before pm2 restarts the process.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// Catch synchronous throws that escaped all handlers.
// Log and exit so pm2 can perform a clean restart instead of leaving
// the process in an unknown state.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception — restarting:', err);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready for connections`);
});
