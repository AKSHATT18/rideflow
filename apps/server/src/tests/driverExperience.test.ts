import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../utils/db';
import * as driverService from '../services/driverService';
import { acceptRide } from '../services/rideService';
import { AppError } from '../utils/AppError';

describe('Phase 5.3: Driver Experience, Navigation & Earnings', () => {
  const timestamp = Date.now();
  let driverA: any;
  let driverB: any;
  let passenger: any;
  let rideCompleted1: any;
  let rideCompleted2: any;
  let rideCancelled: any;

  beforeAll(async () => {
    // 1. Create Driver A
    driverA = await prisma.user.create({
      data: {
        email: `driver_a_${timestamp}@test.com`,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        firstName: 'Marcus',
        lastName: 'Racer',
        passwordHash: 'hashedpwd',
        role: 'DRIVER',
        status: 'ACTIVE',
        driverProfile: {
          create: {
            licenseNumber: 'DL-9876543210',
            vehicleMake: 'Honda',
            vehicleModel: 'Civic',
            vehiclePlate: `DL-01-AB-${Math.floor(1000 + Math.random() * 9000)}`,
            vehicleYear: 2022,
            vehicleColor: 'Silver',
            vehicleCategory: 'ECONOMY',
            isVerified: true,
            status: 'ONLINE',
          },
        },
      },
      include: { driverProfile: true },
    });

    // 2. Create Driver B
    driverB = await prisma.user.create({
      data: {
        email: `driver_b_${timestamp}@test.com`,
        phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
        firstName: 'Siddharth',
        lastName: 'Sharma',
        passwordHash: 'hashedpwd',
        role: 'DRIVER',
        status: 'ACTIVE',
        driverProfile: {
          create: {
            licenseNumber: 'DL-1122334455',
            vehicleMake: 'Hyundai',
            vehicleModel: 'Verna',
            vehiclePlate: `DL-02-CD-${Math.floor(1000 + Math.random() * 9000)}`,
            vehicleYear: 2023,
            vehicleColor: 'Black',
            vehicleCategory: 'COMFORT',
            isVerified: true,
            status: 'ONLINE',
          },
        },
      },
      include: { driverProfile: true },
    });

    // 3. Create Passenger
    passenger = await prisma.user.create({
      data: {
        email: `passenger_${timestamp}@test.com`,
        phone: `+9196${Math.floor(10000000 + Math.random() * 90000000)}`,
        firstName: 'Ananya',
        lastName: 'Iyer',
        passwordHash: 'hashedpwd',
        role: 'PASSENGER',
        status: 'ACTIVE',
      },
    });

    // 4. Create Completed Ride 1 for Driver A (₹500 fare)
    rideCompleted1 = await prisma.ride.create({
      data: {
        passengerId: passenger.id,
        driverId: driverA.id,
        pickupLat: 12.9716,
        pickupLng: 77.5946,
        pickupAddress: 'MG Road Metro, Bengaluru',
        destinationLat: 12.9352,
        destinationLng: 77.6245,
        destinationAddress: 'Koramangala 5th Block, Bengaluru',
        vehicleType: 'ECONOMY',
        estimatedDistanceKm: 6.5,
        estimatedDurationMin: 22,
        estimatedFare: 480,
        finalFare: 500,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 15 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 60 * 1000),
      },
    });

    // Add rating for Completed Ride 1
    await prisma.rating.create({
      data: {
        rideId: rideCompleted1.id,
        passengerId: passenger.id,
        driverId: driverA.id,
        score: 5,
        comment: 'Super polite and on time!',
        tags: ['Great Service', 'Clean Car'],
      },
    });

    // 5. Create Completed Ride 2 for Driver A (₹350 fare)
    rideCompleted2 = await prisma.ride.create({
      data: {
        passengerId: passenger.id,
        driverId: driverA.id,
        pickupLat: 12.9352,
        pickupLng: 77.6245,
        pickupAddress: 'Koramangala 5th Block, Bengaluru',
        destinationLat: 12.9141,
        destinationLng: 77.6411,
        destinationAddress: 'HSR Layout Sector 1, Bengaluru',
        vehicleType: 'ECONOMY',
        estimatedDistanceKm: 4.2,
        estimatedDurationMin: 15,
        estimatedFare: 350,
        finalFare: 350,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 35 * 60 * 1000),
        completedAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    });

    // 6. Create Cancelled Ride for Driver A (Should NOT count toward earnings)
    rideCancelled = await prisma.ride.create({
      data: {
        passengerId: passenger.id,
        driverId: driverA.id,
        pickupLat: 12.9141,
        pickupLng: 77.6411,
        pickupAddress: 'HSR Layout Sector 1, Bengaluru',
        destinationLat: 12.9716,
        destinationLng: 77.5946,
        destinationAddress: 'MG Road Metro, Bengaluru',
        vehicleType: 'ECONOMY',
        estimatedDistanceKm: 8.0,
        estimatedDurationMin: 30,
        estimatedFare: 600,
        finalFare: 600,
        status: 'CANCELLED',
        cancellationReason: 'Rider changed plans',
        cancelledBy: 'PASSENGER',
        cancelledAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.rating.deleteMany({
        where: { driverId: { in: [driverA.id, driverB.id] } },
      });
      await prisma.ride.deleteMany({
        where: { driverId: { in: [driverA.id, driverB.id] } },
      });
      await prisma.driverProfile.deleteMany({
        where: { userId: { in: [driverA.id, driverB.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [driverA.id, driverB.id, passenger.id] } },
      });
    } catch (_e) {}
  });

  // -------------------------------------------------------------
  // Milestone 5.3.1: Driver Profile & Vehicle Management
  // -------------------------------------------------------------
  describe('Milestone 5.3.1: Driver Profile & Vehicle Management', () => {
    it('retrieves authenticated driver profile with vehicle details and live stats', async () => {
      const profile = await driverService.getDriverProfile(driverA.id);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(driverA.id);
      expect(profile.firstName).toBe('Marcus');
      expect(profile.driverProfile.vehicleMake).toBe('Honda');
      expect(profile.driverProfile.vehicleModel).toBe('Civic');
      expect(profile.driverProfile.vehicleCategory).toBe('ECONOMY');
      expect(profile.driverProfile.isVerified).toBe(true);
      expect(profile.driverProfile.totalTrips).toBe(2);
    });

    it('updates permitted personal and vehicle details successfully', async () => {
      const newPlate = `KA-05-ZZ-${Math.floor(1000 + Math.random() * 9000)}`;
      const updated = await driverService.updateDriverProfile(driverA.id, {
        firstName: 'Marcus Updated',
        vehicleMake: 'Honda Prime',
        vehicleColor: 'Deep Blue',
        vehiclePlate: newPlate,
        vehicleYear: 2024,
        vehicleCategory: 'COMFORT',
      });

      expect(updated.firstName).toBe('Marcus Updated');
      expect(updated.driverProfile.vehicleMake).toBe('Honda Prime');
      expect(updated.driverProfile.vehicleColor).toBe('Deep Blue');
      expect(updated.driverProfile.vehiclePlate).toBe(newPlate);
      expect(updated.driverProfile.vehicleYear).toBe(2024);
      expect(updated.driverProfile.vehicleCategory).toBe('COMFORT');
    });

    it('rejects duplicate vehicle registration plates assigned to another driver', async () => {
      const plateDriverB = driverB.driverProfile.vehiclePlate;

      await expect(
        driverService.updateDriverProfile(driverA.id, {
          vehiclePlate: plateDriverB,
        })
      ).rejects.toThrow('This vehicle registration plate is already registered to another driver');
    });

    it('prevents non-driver or unknown user from accessing driver profile', async () => {
      await expect(driverService.getDriverProfile(passenger.id)).rejects.toThrow('Driver profile not found');
    });
  });

  // -------------------------------------------------------------
  // Milestone 5.3.2: Driver Availability & Online Status
  // -------------------------------------------------------------
  describe('Milestone 5.3.2: Driver Availability & Online Status', () => {
    it('toggles driver availability between ONLINE and OFFLINE', async () => {
      const off = await driverService.updateDriverAvailability(driverA.id, 'OFFLINE');
      expect(off.status).toBe('OFFLINE');
      expect(off.isAvailable).toBe(false);

      const on = await driverService.updateDriverAvailability(driverA.id, 'ONLINE');
      expect(on.status).toBe('ONLINE');
      expect(on.isAvailable).toBe(true);
    });

    it('prevents driver from going offline while an active trip is in progress', async () => {
      // Create an active ride assigned to Driver A
      const ongoingRide = await prisma.ride.create({
        data: {
          passengerId: passenger.id,
          driverId: driverA.id,
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          pickupAddress: 'Start point',
          destinationLat: 12.9352,
          destinationLng: 77.6245,
          destinationAddress: 'End point',
          vehicleType: 'ECONOMY',
          estimatedDistanceKm: 5.0,
          estimatedDurationMin: 18,
          estimatedFare: 200,
          status: 'IN_PROGRESS',
        },
      });

      await expect(driverService.updateDriverAvailability(driverA.id, 'OFFLINE')).rejects.toThrow(
        'Cannot go offline while an active trip is in progress'
      );

      // Cleanup ongoing ride
      await prisma.ride.delete({ where: { id: ongoingRide.id } });
    });

    it('blocks suspended driver from updating availability or accepting rides', async () => {
      // Suspend Driver B temporarily
      await prisma.user.update({
        where: { id: driverB.id },
        data: { status: 'SUSPENDED' },
      });

      await expect(driverService.updateDriverAvailability(driverB.id, 'ONLINE')).rejects.toThrow(
        'Suspended drivers cannot update availability or accept rides'
      );

      // Create searching ride to test acceptRide restriction
      const searchingRide = await prisma.ride.create({
        data: {
          passengerId: passenger.id,
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          pickupAddress: 'Pickup test',
          destinationLat: 12.9352,
          destinationLng: 77.6245,
          destinationAddress: 'Dest test',
          vehicleType: 'ECONOMY',
          estimatedDistanceKm: 3.0,
          estimatedDurationMin: 10,
          estimatedFare: 150,
          status: 'SEARCHING',
        },
      });

      await expect(acceptRide(searchingRide.id, driverB.id)).rejects.toThrow(
        'Suspended drivers cannot accept rides'
      );

      // Restore Driver B status and cleanup ride
      await prisma.user.update({
        where: { id: driverB.id },
        data: { status: 'ACTIVE' },
      });
      await prisma.ride.delete({ where: { id: searchingRide.id } });
    });

    it('blocks unverified driver from going online or accepting rides', async () => {
      // Mark Driver B unverified temporarily
      await prisma.driverProfile.update({
        where: { userId: driverB.id },
        data: { isVerified: false },
      });

      await expect(driverService.updateDriverAvailability(driverB.id, 'ONLINE')).rejects.toThrow(
        'Unverified drivers cannot go online or accept rides'
      );

      // Restore Driver B verification
      await prisma.driverProfile.update({
        where: { userId: driverB.id },
        data: { isVerified: true },
      });
    });
  });

  // -------------------------------------------------------------
  // Milestone 5.3.4: Driver Earnings Dashboard
  // -------------------------------------------------------------
  describe('Milestone 5.3.4: Driver Earnings Dashboard', () => {
    it('calculates driver payout accurately with explicit 80/20 platform commission', () => {
      expect(driverService.calculateDriverEarnings(500)).toBe(400); // 80% of 500 = 400
      expect(driverService.calculatePlatformFee(500)).toBe(100); // 20% of 500 = 100

      expect(driverService.calculateDriverEarnings(350)).toBe(280); // 80% of 350 = 280
      expect(driverService.calculatePlatformFee(350)).toBe(70); // 20% of 350 = 70
    });

    it('aggregates lifetime, today, this week, and this month earnings correctly', async () => {
      const earnings = await driverService.getDriverEarnings(driverA.id);

      // Completed Ride 1 (500 fare -> 400 earnings) + Completed Ride 2 (350 fare -> 280 earnings) = 680
      // Cancelled Ride (600 fare) MUST NOT be included!
      expect(earnings.totalCompletedTrips).toBe(2);
      expect(earnings.lifetimeEarnings).toBe(680);
      expect(earnings.todayEarnings).toBe(680);
      expect(earnings.averageEarningsPerTrip).toBe(340);
      expect(earnings.commissionRate).toBe(0.20);
      expect(earnings.payoutRate).toBe(0.80);
      expect(earnings.dailyEarnings.length).toBe(7);
      expect(earnings.recentTrips.length).toBe(2);
      expect(earnings.recentTrips[0].driverEarnings).toBe(400);
      expect(earnings.recentTrips[0].platformCommission).toBe(100);
    });

    it('returns clean empty metrics for a driver with zero completed rides', async () => {
      const earnings = await driverService.getDriverEarnings(driverB.id);

      expect(earnings.totalCompletedTrips).toBe(0);
      expect(earnings.lifetimeEarnings).toBe(0);
      expect(earnings.todayEarnings).toBe(0);
      expect(earnings.averageEarningsPerTrip).toBe(0);
      expect(earnings.recentTrips).toEqual([]);
      expect(earnings.dailyEarnings.length).toBe(7);
    });
  });

  // -------------------------------------------------------------
  // Milestone 5.3.5: Driver Trip History
  // -------------------------------------------------------------
  describe('Milestone 5.3.5: Driver Trip History', () => {
    it('retrieves paginated driver trip history with status and date filters', async () => {
      const history = await driverService.getDriverTrips(driverA.id, {
        status: 'ALL',
        page: 1,
        limit: 10,
      });

      expect(history.trips.length).toBe(3); // 2 completed + 1 cancelled
      expect(history.pagination.total).toBe(3);
      expect(history.pagination.page).toBe(1);

      // Verify passenger name is masked and passenger phone is not exposed
      const trip = history.trips[0];
      expect(trip.passenger.name).toBe('Ananya I.');
      expect((trip.passenger as any).phone).toBeUndefined();
    });

    it('filters trips by COMPLETED status correctly', async () => {
      const history = await driverService.getDriverTrips(driverA.id, {
        status: 'COMPLETED',
        page: 1,
        limit: 10,
      });

      expect(history.trips.length).toBe(2);
      expect(history.trips.every((t) => t.status === 'COMPLETED')).toBe(true);
      expect(history.trips[0].driverEarnings).toBeGreaterThan(0);
    });

    it('filters trips by CANCELLED status and verifies 0 earnings', async () => {
      const history = await driverService.getDriverTrips(driverA.id, {
        status: 'CANCELLED',
        page: 1,
        limit: 10,
      });

      expect(history.trips.length).toBe(1);
      expect(history.trips[0].status).toBe('CANCELLED');
      expect(history.trips[0].driverEarnings).toBe(0);
      expect(history.trips[0].cancellationReason).toBe('Rider changed plans');
    });

    it('enforces strict cross-driver data isolation', async () => {
      // Driver B has 0 rides
      const historyB = await driverService.getDriverTrips(driverB.id, {
        status: 'ALL',
        page: 1,
        limit: 10,
      });

      expect(historyB.trips.length).toBe(0);
      expect(historyB.pagination.total).toBe(0);
    });
  });
});
