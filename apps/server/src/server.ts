import 'dotenv/config';
import app from './app';
import { initSocket } from './socket';

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`[server]: RideFlow API is running at http://localhost:${PORT}`);
});

// Initialize Socket.IO
initSocket(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received. Closing http server.');
  server.close(() => {
    console.log('Http server closed.');
    process.exit(0);
  });
});
