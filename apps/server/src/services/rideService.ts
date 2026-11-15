import { prisma } from '../utils/db';
import { AppError } from '../utils/AppError';
import { CreateRideInput } from '../utils/rideValidation';
import { calculateFare } from '../utils/fare';
import { getIO } from '../socket';
import { RideStatus } from '@prisma/client';

const ACTIVE_STATUSES: RideStatus[] = [
  'REQUESTED',
  'SEARCHING',
  'DRIVER_ASSIGNED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'IN_PROGRESS',
];

export const createRide = async (passengerId: string, input: CreateRideInput) => {
  // Check if passenger already has an ongoing active ride
  const activeRide = await prisma.ride.findFirst({
    where: {
      passengerId,
      status: { in: ACTIVE_STATUSES },
    },
  });

  if (activeRide) {
    throw new AppError('You already have an active ride in progress', 400);
  }

  // Server-side calculation of estimated fare
  const estimatedFare = calculateFare(
    input.estimatedDistanceKm,
    input.estimatedDurationMin,
    input.vehicleType
  );

  const ride = await prisma.ride.create({
    data: {
      passengerId,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
      pickupAddress: input.pickupAddress,
      destinationLat: input.destinationLat,
      destinationLng: input.destinationLng,
      destinationAddress: input.destinationAddress,
      vehicleType: input.vehicleType,
      estimatedDistanceKm: input.estimatedDistanceKm,
      estimatedDurationMin: input.estimatedDurationMin,
      estimatedFare,
      status: 'SEARCHING',
    },
    include: {
      passenger: { select: { firstName: true, lastName: true, phone: true } },
    },
  });

  return ride;
};

export const getRideById = async (rideId: string, userId: string, role: string) => {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      passenger: { select: { firstName: true, lastName: true, phone: true } },
      driver: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          driverProfile: {
            select: {
              vehicleMake: true,
              vehicleModel: true,
              vehiclePlate: true,
              rating: true,
            },
          },
        },
      },
    },
  });

  if (!ride) throw new AppError('Ride not found', 404);

  // Authorization check
  if (role === 'PASSENGER' && ride.passengerId !== userId) {
    throw new AppError('Unauthorized access to ride', 403);
  }
  if (role === 'DRIVER' && ride.driverId && ride.driverId !== userId) {
    throw new AppError('Unauthorized access to ride', 403);
  }

  return ride;
};

export const getActiveRide = async (userId: string, role: string) => {
  const whereClause =
    role === 'PASSENGER'
      ? { passengerId: userId, status: { in: ACTIVE_STATUSES } }
      : { driverId: userId, status: { in: ACTIVE_STATUSES } };

  const ride = await prisma.ride.findFirst({
    where: whereClause,
    include: {
      passenger: { select: { firstName: true, lastName: true, phone: true } },
      driver: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          driverProfile: {
            select: {
              vehicleMake: true,
              vehicleModel: true,
              vehiclePlate: true,
              rating: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ride;
};

export const getMyRides = async (userId: string, role: string) => {
  const whereClause = role === 'PASSENGER' ? { passengerId: userId } : { driverId: userId };

  return prisma.ride.findMany({
    where: whereClause,
    include: {
      passenger: { select: { firstName: true, lastName: true, phone: true } },
      driver: { select: { firstName: true, lastName: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

export const acceptRide = async (rideId: string, driverId: string) => {
  // ATOMIC ACCEPTANCE using transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify driver exists and status is ONLINE
      const driverProfile = await tx.driverProfile.findUnique({ where: { userId: driverId } });
      if (!driverProfile) throw new AppError('Driver profile not found', 404);
      if (driverProfile.status !== 'ONLINE') {
        throw new AppError('Driver must be ONLINE to accept rides', 400);
      }

      // 2. Verify driver doesn't already have an ongoing ride
      const activeDriverRide = await tx.ride.findFirst({
        where: {
          driverId,
          status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
        },
      });
      if (activeDriverRide) {
        throw new AppError('Driver already has an active ride assigned', 400);
      }

      // 3. Atomically update the ride strictly from SEARCHING to DRIVER_ASSIGNED
      const rideUpdate = await tx.ride.updateMany({
        where: {
          id: rideId,
          status: 'SEARCHING',
          driverId: null,
        },
        data: {
          status: 'DRIVER_ASSIGNED',
          driverId,
          acceptedAt: new Date(),
        },
      });

      // If count is 0, another driver won the race or ride was cancelled
      if (rideUpdate.count === 0) {
        throw new AppError('Ride is no longer available', 409);
      }

      // 4. Update driver status to BUSY
      await tx.driverProfile.update({
        where: { userId: driverId },
        data: { status: 'BUSY' },
      });

      // 5. Fetch and return complete updated ride
      return tx.ride.findUnique({
        where: { id: rideId },
        include: {
          passenger: { select: { firstName: true, lastName: true, phone: true } },
          driver: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              driverProfile: {
                select: {
                  vehicleMake: true,
                  vehicleModel: true,
                  vehiclePlate: true,
                  rating: true,
                },
              },
            },
          },
        },
      });
    });

    if (result) {
      try {
        const io = getIO();
        io.to(`ride:${rideId}`).emit('ride:status', { status: 'DRIVER_ASSIGNED', ride: result });
      } catch (e) {
        // Socket may not be initialized in isolated unit tests
      }
    }

    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to accept ride', 500);
  }
};

export const markDriverArrived = async (rideId: string, driverId: string) => {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new AppError('Ride not found', 404);
  if (ride.driverId !== driverId) throw new AppError('Unauthorized', 403);

  if (ride.status !== 'DRIVER_ASSIGNED' && ride.status !== 'DRIVER_ARRIVING') {
    throw new AppError(
      `Cannot mark arrived from current status: ${ride.status}`,
      400
    );
  }

  const updatedRide = await prisma.ride.update({
    where: { id: rideId },
    data: { status: 'DRIVER_ARRIVED' },
    include: {
      passenger: { select: { firstName: true, lastName: true, phone: true } },
      driver: { select: { firstName: true, lastName: true, phone: true } },
    },
  });

  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:status', { status: 'DRIVER_ARRIVED', ride: updatedRide });
  } catch (e) {}

  return updatedRide;
};

export const startRide = async (rideId: string, driverId: string) => {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new AppError('Ride not found', 404);
  if (ride.driverId !== driverId) throw new AppError('Unauthorized', 403);

  if (ride.status !== 'DRIVER_ARRIVED') {
    throw new AppError(
      `Cannot start ride from current status: ${ride.status}. Driver must mark arrived first.`,
      400
    );
  }

  const updatedRide = await prisma.ride.update({
    where: { id: rideId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
    include: {
      passenger: { select: { firstName: true, lastName: true, phone: true } },
      driver: { select: { firstName: true, lastName: true, phone: true } },
    },
  });

  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:status', { status: 'IN_PROGRESS', ride: updatedRide });
  } catch (e) {}

  return updatedRide;
};

export const completeRide = async (rideId: string, driverId: string) => {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new AppError('Ride not found', 404);
  if (ride.driverId !== driverId) throw new AppError('Unauthorized', 403);

  if (ride.status !== 'IN_PROGRESS') {
    throw new AppError(
      `Cannot complete ride from current status: ${ride.status}. Ride must be IN_PROGRESS.`,
      400
    );
  }

  // Calculate authoritative final fare
  const finalFare = calculateFare(
    ride.estimatedDistanceKm,
    ride.estimatedDurationMin,
    ride.vehicleType
  );

  const result = await prisma.$transaction(async (tx) => {
    const updatedRide = await tx.ride.update({
      where: { id: rideId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        finalFare,
      },
      include: {
        passenger: { select: { firstName: true, lastName: true, phone: true } },
        driver: { select: { firstName: true, lastName: true, phone: true } },
      },
    });

    // Release driver back to ONLINE
    await tx.driverProfile.update({
      where: { userId: driverId },
      data: { status: 'ONLINE' },
    });

    return updatedRide;
  });

  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:status', { status: 'COMPLETED', ride: result });
  } catch (e) {}

  return result;
};

export const updateRideStatus = async (
  rideId: string,
  driverId: string,
  newStatus: 'DRIVER_ARRIVING' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'
) => {
  switch (newStatus) {
    case 'DRIVER_ARRIVED':
      return markDriverArrived(rideId, driverId);
    case 'IN_PROGRESS':
      return startRide(rideId, driverId);
    case 'COMPLETED':
      return completeRide(rideId, driverId);
    default:
      throw new AppError(`Unsupported status update: ${newStatus}`, 400);
  }
};

export const cancelRide = async (rideId: string, userId: string, role: string) => {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new AppError('Ride not found', 404);

  if (role === 'PASSENGER' && ride.passengerId !== userId) throw new AppError('Unauthorized', 403);
  if (role === 'DRIVER' && ride.driverId !== userId) throw new AppError('Unauthorized', 403);

  if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
    throw new AppError('Cannot cancel a completed or already cancelled ride', 400);
  }

  // Passenger can only cancel before trip is IN_PROGRESS
  if (role === 'PASSENGER' && ride.status === 'IN_PROGRESS') {
    throw new AppError('Cannot cancel a ride that is already in progress', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedRide = await tx.ride.update({
      where: { id: rideId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: {
        passenger: { select: { firstName: true, lastName: true, phone: true } },
        driver: { select: { firstName: true, lastName: true, phone: true } },
      },
    });

    // If driver was assigned, free them up to ONLINE
    if (ride.driverId) {
      await tx.driverProfile.update({
        where: { userId: ride.driverId },
        data: { status: 'ONLINE' },
      });
    }

    return updatedRide;
  });

  try {
    const io = getIO();
    io.to(`ride:${rideId}`).emit('ride:status', { status: 'CANCELLED', ride: result });
  } catch (e) {}

  return result;
};

export const getPendingRides = async () => {
  return prisma.ride.findMany({
    where: { status: 'SEARCHING' },
    include: {
      passenger: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};
