import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../utils/db';
import * as rideService from '../services/rideService';
import { AppError } from '../utils/AppError';

describe('Live PostgreSQL Ride Lifecycle & Concurrency Verification', () => {
  let passengerId: string;
  let driver1Id: string;
  let driver2Id: string;
  const testEmailPrefix = `test_${Date.now()}`;

  beforeAll(async () => {
    // 1. Verify PostgreSQL connection
    await prisma.$connect();

    // 2. Setup test passenger
    const passenger = await prisma.user.create({
      data: {
        email: `${testEmailPrefix}_passenger@rideflow.test`,
        phone: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
        firstName: 'Test',
        lastName: 'Passenger',
        passwordHash: 'dummyhash',
        role: 'PASSENGER',
      },
    });
    passengerId = passenger.id;

    // 3. Setup test driver 1 (ONLINE)
    const driver1 = await prisma.user.create({
      data: {
        email: `${testEmailPrefix}_driver1@rideflow.test`,
        phone: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
        firstName: 'Speedy',
        lastName: 'Driver1',
        passwordHash: 'dummyhash',
        role: 'DRIVER',
        driverProfile: {
          create: {
            vehicleMake: 'Toyota',
            vehicleModel: 'Innova',
            vehiclePlate: 'KA-01-AB-1234',
            status: 'ONLINE',
          },
        },
      },
    });
    driver1Id = driver1.id;

    // 4. Setup test driver 2 (ONLINE)
    const driver2 = await prisma.user.create({
      data: {
        email: `${testEmailPrefix}_driver2@rideflow.test`,
        phone: `+919999${Math.floor(100000 + Math.random() * 900000)}`,
        firstName: 'Rapid',
        lastName: 'Driver2',
        passwordHash: 'dummyhash',
        role: 'DRIVER',
        driverProfile: {
          create: {
            vehicleMake: 'Honda',
            vehicleModel: 'City',
            vehiclePlate: 'KA-01-CD-5678',
            status: 'ONLINE',
          },
        },
      },
    });
    driver2Id = driver2.id;
  });

  afterAll(async () => {
    // Cleanup test users and rides
    try {
      await prisma.ride.deleteMany({
        where: { passengerId },
      });
      await prisma.driverProfile.deleteMany({
        where: { userId: { in: [driver1Id, driver2Id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [passengerId, driver1Id, driver2Id] } },
      });
      await prisma.$disconnect();
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('1. Verifies database connectivity to PostgreSQL', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    expect(result).toBeDefined();
  });

  let createdRideId: string;

  it('2. Passenger creates ride and persists in PostgreSQL', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupLat: 12.9716,
      pickupLng: 77.5946,
      pickupAddress: 'MG Road Metro, Bangalore',
      destinationLat: 12.9352,
      destinationLng: 77.6245,
      destinationAddress: 'Sony Signal, Koramangala, Bangalore',
      vehicleType: 'ECONOMY',
      estimatedDistanceKm: 8.5,
      estimatedDurationMin: 25,
    });

    createdRideId = ride.id;

    expect(ride.id).toBeDefined();
    expect(ride.status).toBe('SEARCHING');
    // Fare calculation: 50 + (8.5 * 12) + (25 * 2) = 50 + 102 + 50 = 202
    expect(ride.estimatedFare).toBe(202);
    expect(ride.requestedAt).toBeInstanceOf(Date);

    // Verify directly from live PostgreSQL database
    const dbRide = await prisma.ride.findUnique({ where: { id: ride.id } });
    expect(dbRide).not.toBeNull();
    expect(dbRide?.status).toBe('SEARCHING');
    expect(dbRide?.driverId).toBeNull();
  });

  it('3. Two concurrent drivers attempt to accept the same ride (Atomic 409 Conflict)', async () => {
    // Both driver1 and driver2 try to accept createdRideId simultaneously
    const [result1, result2] = await Promise.allSettled([
      rideService.acceptRide(createdRideId, driver1Id),
      rideService.acceptRide(createdRideId, driver2Id),
    ]);

    const successes = [result1, result2].filter((r) => r.status === 'fulfilled');
    const failures = [result1, result2].filter((r) => r.status === 'rejected');

    // Exactly one must win the atomic race
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // The losing driver must receive 409 Conflict
    const rejection = failures[0] as PromiseRejectedResult;
    expect(rejection.reason).toBeInstanceOf(AppError);
    expect(rejection.reason.statusCode).toBe(409);
    expect(rejection.reason.message).toBe('Ride is no longer available');

    // Verify winning driver status transitioned to BUSY in PostgreSQL
    const winningDriverId = (successes[0] as PromiseFulfilledResult<any>).value.driverId;
    const winningProfile = await prisma.driverProfile.findUnique({
      where: { userId: winningDriverId },
    });
    expect(winningProfile?.status).toBe('BUSY');

    // Verify ride in DB has DRIVER_ASSIGNED
    const dbRide = await prisma.ride.findUnique({ where: { id: createdRideId } });
    expect(dbRide?.status).toBe('DRIVER_ASSIGNED');
    expect(dbRide?.driverId).toBe(winningDriverId);
    expect(dbRide?.acceptedAt).toBeInstanceOf(Date);
  });

  it('4. Completes remaining lifecycle: arrived -> in_progress -> completed with final fare', async () => {
    const dbRide = await prisma.ride.findUnique({ where: { id: createdRideId } });
    const assignedDriverId = dbRide!.driverId!;

    // Step A: Mark Driver Arrived
    const arrivedRide = await rideService.markDriverArrived(createdRideId, assignedDriverId);
    expect(arrivedRide.status).toBe('DRIVER_ARRIVED');

    // Step B: Passenger retrieves OTP & Driver verifies OTP to start trip
    const otpData = await rideService.getRideOTP(createdRideId, passengerId, 'PASSENGER');
    expect(otpData.otp).toHaveLength(4);

    const startedRide = await rideService.verifyRideOTP(createdRideId, assignedDriverId, otpData.otp);
    expect(startedRide.status).toBe('IN_PROGRESS');
    expect(startedRide.startedAt).toBeInstanceOf(Date);

    // Step C: Complete Ride
    const completedRide = await rideService.completeRide(createdRideId, assignedDriverId);
    expect(completedRide.status).toBe('COMPLETED');
    expect(completedRide.completedAt).toBeInstanceOf(Date);
    expect(completedRide.finalFare).toBe(202);

    // Verify assigned driver is freed back to ONLINE
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: assignedDriverId },
    });
    expect(driverProfile?.status).toBe('ONLINE');
  });

  it('5. Verifies ride history and active ride restoration', async () => {
    // Passenger active ride should now be null since trip completed
    const activeRide = await rideService.getActiveRide(passengerId, 'PASSENGER');
    expect(activeRide).toBeNull();

    // Passenger ride history should contain the completed ride
    const history = await rideService.getMyRides(passengerId, 'PASSENGER');
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].id).toBe(createdRideId);
    expect(history[0].status).toBe('COMPLETED');
    expect(history[0].finalFare).toBe(202);
  });
});
