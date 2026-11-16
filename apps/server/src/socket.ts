import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import * as cookie from 'cookie';
import { verifyToken, TokenPayload } from './utils/jwt';
import { prisma } from './utils/db';
import { locationUpdateSchema } from './utils/rideValidation';

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.request.headers.cookie || '';
      const cookies = cookie.parse(cookieHeader);
      const token = cookies.jwt;

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const decoded = verifyToken(token);
      socket.data.user = decoded; // { userId, role }
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as TokenPayload;

    // Strict Ride Room Join logic
    socket.on('ride:join', async (rideId: string) => {
      try {
        if (!rideId || typeof rideId !== 'string') {
          socket.emit('error', 'Invalid rideId');
          return;
        }

        const ride = await prisma.ride.findUnique({
          where: { id: rideId },
          select: { id: true, passengerId: true, driverId: true, status: true },
        });

        if (!ride) {
          socket.emit('error', 'Ride not found');
          return;
        }

        // Strict Server-Side Room Authorization
        if (ride.passengerId === user.userId || ride.driverId === user.userId) {
          socket.join(`ride:${rideId}`);
          socket.emit('ride:joined', { rideId });
        } else {
          socket.emit('error', 'Unauthorized to join this ride room');
        }
      } catch (error) {
        socket.emit('error', 'Failed to join ride room');
      }
    });

    socket.on('ride:leave', (rideId: string) => {
      socket.leave(`ride:${rideId}`);
    });

    // Real-Time Driver Location Events
    socket.on('ride:location', async (payload: unknown) => {
      if (user.role !== 'DRIVER') {
        socket.emit('error', 'Only drivers can emit location updates');
        return;
      }

      // Validate payload schema (lat, lng, timestamp, rideId)
      const parsed = locationUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', 'Invalid location update payload');
        return;
      }

      const { rideId, latitude, longitude, timestamp } = parsed.data;

      // Verify socket has joined the room
      if (!socket.rooms.has(`ride:${rideId}`)) {
        socket.emit('error', 'Must join ride room before broadcasting location');
        return;
      }

      // Verify that this driver is actually assigned to this ride and ride is active
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        select: { driverId: true, status: true },
      });

      if (!ride || ride.driverId !== user.userId) {
        socket.emit('error', 'Unauthorized driver for this ride');
        return;
      }

      const activeStatuses = ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'];
      if (!activeStatuses.includes(ride.status)) {
        socket.emit('error', 'Ride is not in an active tracking state');
        return;
      }

      // Broadcast transient location directly to the authorized ride room
      io.to(`ride:${rideId}`).emit('ride:location', {
        driverId: user.userId,
        latitude,
        longitude,
        timestamp,
      });
    });

    socket.on('disconnect', () => {
      // User socket disconnected; room membership is cleaned up automatically by Socket.IO
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
