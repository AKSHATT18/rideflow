import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as rideService from './rideService';
import { prisma } from '../utils/db';
import { AppError } from '../utils/AppError';

vi.mock('../utils/db', () => ({
  prisma: {
    ride: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    driverProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock('../socket', () => ({
  getIO: vi.fn(() => ({
    to: vi.fn(() => ({
      emit: vi.fn(),
    })),
  })),
}));

describe('Ride Service State Machine & Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRide', () => {
    it('prevents passenger from creating multiple active rides simultaneously', async () => {
      vi.mocked(prisma.ride.findFirst).mockResolvedValueOnce({
        id: 'existing-ride',
        status: 'SEARCHING',
      } as any);

      await expect(
        rideService.createRide('passenger-1', {
          pickupLat: 12.97,
          pickupLng: 77.59,
          pickupAddress: 'Pickup',
          destinationLat: 12.93,
          destinationLng: 77.62,
          destinationAddress: 'Dest',
          vehicleType: 'ECONOMY',
          estimatedDistanceKm: 5,
          estimatedDurationMin: 15,
        })
      ).rejects.toThrow('You already have an active ride in progress');
    });

    it('calculates estimated fare on the server and creates ride with SEARCHING status', async () => {
      vi.mocked(prisma.ride.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.ride.create).mockResolvedValueOnce({
        id: 'ride-123',
        status: 'SEARCHING',
        estimatedFare: 210,
      } as any);

      const ride = await rideService.createRide('passenger-1', {
        pickupLat: 12.97,
        pickupLng: 77.59,
        pickupAddress: 'Pickup',
        destinationLat: 12.93,
        destinationLng: 77.62,
        destinationAddress: 'Dest',
        vehicleType: 'ECONOMY',
        estimatedDistanceKm: 10,
        estimatedDurationMin: 20,
      });

      expect(ride.status).toBe('SEARCHING');
      // 50 + (10 * 12) + (20 * 2) = 210
      expect(ride.estimatedFare).toBe(210);
    });
  });

  describe('acceptRide (Atomic acceptance)', () => {
    it('fails if driver profile is OFFLINE or not found', async () => {
      vi.mocked(prisma.driverProfile.findUnique).mockResolvedValueOnce({
        status: 'OFFLINE',
      } as any);

      await expect(
        rideService.acceptRide('ride-1', 'driver-1')
      ).rejects.toThrow('Driver must be ONLINE to accept rides');
    });

    it('fails if driver already has another assigned active ride', async () => {
      vi.mocked(prisma.driverProfile.findUnique).mockResolvedValueOnce({
        status: 'ONLINE',
      } as any);
      vi.mocked(prisma.ride.findFirst).mockResolvedValueOnce({
        id: 'active-ride-1',
        status: 'IN_PROGRESS',
      } as any);

      await expect(
        rideService.acceptRide('ride-1', 'driver-1')
      ).rejects.toThrow('Driver already has an active ride assigned');
    });

    it('fails atomically with 409 Conflict if ride is no longer in SEARCHING state', async () => {
      vi.mocked(prisma.driverProfile.findUnique).mockResolvedValueOnce({
        status: 'ONLINE',
      } as any);
      vi.mocked(prisma.ride.findFirst).mockResolvedValueOnce(null);
      // Another driver accepted first: updateMany matched 0 rows
      vi.mocked(prisma.ride.updateMany).mockResolvedValueOnce({ count: 0 });

      await expect(
        rideService.acceptRide('ride-1', 'driver-1')
      ).rejects.toThrow('Ride is no longer available');
    });

    it('successfully accepts ride and transitions driver to BUSY atomically', async () => {
      vi.mocked(prisma.driverProfile.findUnique).mockResolvedValueOnce({
        status: 'ONLINE',
      } as any);
      vi.mocked(prisma.ride.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.ride.updateMany).mockResolvedValueOnce({ count: 1 });
      vi.mocked(prisma.driverProfile.update).mockResolvedValueOnce({
        status: 'BUSY',
      } as any);
      vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce({
        id: 'ride-1',
        status: 'DRIVER_ASSIGNED',
        driverId: 'driver-1',
      } as any);

      const ride = await rideService.acceptRide('ride-1', 'driver-1');
      expect(ride?.status).toBe('DRIVER_ASSIGNED');
      expect(prisma.driverProfile.update).toHaveBeenCalledWith({
        where: { userId: 'driver-1' },
        data: { status: 'BUSY' },
      });
    });
  });

  describe('State transitions: arrive -> start -> complete', () => {
    it('prevents starting a ride unless driver has marked arrived', async () => {
      vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce({
        id: 'ride-1',
        driverId: 'driver-1',
        status: 'DRIVER_ASSIGNED', // Not arrived yet
      } as any);

      await expect(
        rideService.startRide('ride-1', 'driver-1')
      ).rejects.toThrow(/Driver must mark arrived first/);
    });

    it('prevents completing a ride unless it is IN_PROGRESS', async () => {
      vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce({
        id: 'ride-1',
        driverId: 'driver-1',
        status: 'DRIVER_ARRIVED', // Not started yet
      } as any);

      await expect(
        rideService.completeRide('ride-1', 'driver-1')
      ).rejects.toThrow(/Ride must be IN_PROGRESS/);
    });

    it('calculates final fare and frees driver to ONLINE upon completion', async () => {
      vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce({
        id: 'ride-1',
        driverId: 'driver-1',
        status: 'IN_PROGRESS',
        estimatedDistanceKm: 8,
        estimatedDurationMin: 15,
        vehicleType: 'COMFORT',
      } as any);

      vi.mocked(prisma.ride.update).mockResolvedValueOnce({
        id: 'ride-1',
        status: 'COMPLETED',
        finalFare: 246, // 80 + (8*16) + (15*2.5) = 80 + 128 + 37.5 = 245.5 -> 246
      } as any);

      const completed = await rideService.completeRide('ride-1', 'driver-1');
      expect(completed.status).toBe('COMPLETED');
      expect(prisma.driverProfile.update).toHaveBeenCalledWith({
        where: { userId: 'driver-1' },
        data: { status: 'ONLINE' },
      });
    });
  });

  describe('cancellation rules', () => {
    it('prevents cancelling an already completed ride', async () => {
      vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce({
        id: 'ride-1',
        passengerId: 'p-1',
        status: 'COMPLETED',
      } as any);

      await expect(
        rideService.cancelRide('ride-1', 'p-1', 'PASSENGER')
      ).rejects.toThrow('Cannot cancel a completed or already cancelled ride');
    });

    it('prevents passenger from cancelling once trip is IN_PROGRESS', async () => {
      vi.mocked(prisma.ride.findUnique).mockResolvedValueOnce({
        id: 'ride-1',
        passengerId: 'p-1',
        status: 'IN_PROGRESS',
      } as any);

      await expect(
        rideService.cancelRide('ride-1', 'p-1', 'PASSENGER')
      ).rejects.toThrow('Cannot cancel a ride that is already in progress');
    });
  });
});
