import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../utils/db';
import * as passengerService from '../services/passengerService';
import * as rideService from '../services/rideService';
import { SavedLocationType, RideStatus } from '@prisma/client';

describe('Milestone 5.1: Passenger Profiles, Saved Locations, Receipts & Ratings', () => {
  let testPassenger: any;
  let testDriver: any;
  let testRide: any;

  beforeAll(async () => {
    // Clean up previous test entities if any
    await prisma.rating.deleteMany({
      where: { comment: { contains: 'TestReviewTag' } },
    });
    await prisma.savedLocation.deleteMany({
      where: { name: { contains: 'TestLocation' } },
    });
    await prisma.ride.deleteMany({
      where: { pickupAddress: { contains: 'TestPickup51' } },
    });

    // Create a test passenger
    const unique = Date.now();
    testPassenger = await prisma.user.create({
      data: {
        email: `pass51_${unique}@test.com`,
        phone: `+9198765${String(unique).slice(-5)}`,
        firstName: 'Aarav',
        lastName: 'Sharma',
        passwordHash: 'dummyhash',
        role: 'PASSENGER',
      },
    });

    // Create a test driver
    testDriver = await prisma.user.create({
      data: {
        email: `driver51_${unique}@test.com`,
        phone: `+9198764${String(unique).slice(-5)}`,
        firstName: 'Rajesh',
        lastName: 'Kumar',
        passwordHash: 'dummyhash',
        role: 'DRIVER',
        driverProfile: {
          create: {
            licenseNumber: 'DL-51-TEST',
            vehicleMake: 'Hyundai',
            vehicleModel: 'Verna',
            vehiclePlate: 'KA01AB5151',
            status: 'ONLINE',
            rating: 5.0,
            ratingCount: 0,
          },
        },
      },
      include: { driverProfile: true },
    });

    // Create a completed test ride
    testRide = await prisma.ride.create({
      data: {
        passengerId: testPassenger.id,
        driverId: testDriver.id,
        pickupLat: 12.9716,
        pickupLng: 77.5946,
        pickupAddress: 'TestPickup51 - MG Road, Bengaluru',
        destinationLat: 12.9352,
        destinationLng: 77.6245,
        destinationAddress: 'Koramangala 5th Block, Bengaluru',
        vehicleType: 'COMFORT',
        estimatedDistanceKm: 6.5,
        estimatedDurationMin: 20,
        estimatedFare: 234,
        finalFare: 234,
        status: RideStatus.COMPLETED,
        startedAt: new Date(Date.now() - 3600000),
        completedAt: new Date(Date.now() - 1800000),
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testRide) {
      await prisma.rating.deleteMany({ where: { rideId: testRide.id } });
      await prisma.ride.deleteMany({ where: { id: testRide.id } });
    }
    if (testPassenger) {
      await prisma.savedLocation.deleteMany({ where: { userId: testPassenger.id } });
      await prisma.user.deleteMany({ where: { id: testPassenger.id } });
    }
    if (testDriver) {
      await prisma.driverProfile.deleteMany({ where: { userId: testDriver.id } });
      await prisma.user.deleteMany({ where: { id: testDriver.id } });
    }
  });

  describe('Saved Locations CRUD', () => {
    let savedHomeId: string;

    it('creates a new saved Home location', async () => {
      const loc = await passengerService.createSavedLocation(testPassenger.id, {
        name: 'TestLocation Home',
        address: 'Indiranagar 100ft Road, Bengaluru',
        lat: 12.9784,
        lng: 77.6408,
        type: SavedLocationType.HOME,
      });

      expect(loc).toBeDefined();
      expect(loc.name).toBe('TestLocation Home');
      expect(loc.type).toBe(SavedLocationType.HOME);
      savedHomeId = loc.id;
    });

    it('upserts Home when another Home location is created', async () => {
      const updatedLoc = await passengerService.createSavedLocation(testPassenger.id, {
        name: 'TestLocation Home Updated',
        address: 'Indiranagar 12th Main, Bengaluru',
        lat: 12.9799,
        lng: 77.6415,
        type: SavedLocationType.HOME,
      });

      expect(updatedLoc.id).toBe(savedHomeId);
      expect(updatedLoc.name).toBe('TestLocation Home Updated');

      const allLocs = await passengerService.getSavedLocations(testPassenger.id);
      const homes = allLocs.filter((l) => l.type === SavedLocationType.HOME);
      expect(homes.length).toBe(1);
    });

    it('creates a Favorite saved location', async () => {
      const fav = await passengerService.createSavedLocation(testPassenger.id, {
        name: 'TestLocation Gym',
        address: 'Cult Fit Koramangala',
        lat: 12.934,
        lng: 77.62,
        type: SavedLocationType.FAVORITE,
      });

      expect(fav.id).toBeDefined();
      expect(fav.type).toBe(SavedLocationType.FAVORITE);
    });

    it('prevents another user from modifying a saved location', async () => {
      await expect(
        passengerService.updateSavedLocation(testDriver.id, savedHomeId, {
          name: 'Hacked Name',
        })
      ).rejects.toThrow('Unauthorized');
    });

    it('deletes a saved location successfully', async () => {
      const res = await passengerService.deleteSavedLocation(testPassenger.id, savedHomeId);
      expect(res.success).toBe(true);

      const all = await passengerService.getSavedLocations(testPassenger.id);
      expect(all.some((l) => l.id === savedHomeId)).toBe(false);
    });
  });

  describe('Passenger Profile & Stats', () => {
    it('returns profile with aggregate statistics', async () => {
      const profile = await passengerService.getPassengerProfile(testPassenger.id);

      expect(profile.id).toBe(testPassenger.id);
      expect(profile.email).toBe(testPassenger.email);
      expect(profile.stats).toBeDefined();
      expect(profile.stats.totalRides).toBeGreaterThanOrEqual(1);
      expect(profile.stats.completedRides).toBeGreaterThanOrEqual(1);
      expect(profile.stats.totalSpent).toBeGreaterThanOrEqual(234);
    });

    it('updates passenger profile details', async () => {
      const updated = await passengerService.updatePassengerProfile(testPassenger.id, {
        firstName: 'Aarav Updated',
        lastName: 'Sharma Jr',
      });

      expect(updated.firstName).toBe('Aarav Updated');
      expect(updated.lastName).toBe('Sharma Jr');
    });
  });

  describe('Ride History & Receipt', () => {
    it('retrieves filtered passenger ride history', async () => {
      const history = await passengerService.getPassengerRideHistory(testPassenger.id, {
        status: RideStatus.COMPLETED,
        page: 1,
        limit: 10,
      });

      expect(history.rides).toBeDefined();
      expect(history.rides.length).toBeGreaterThanOrEqual(1);
      expect(history.pagination.total).toBeGreaterThanOrEqual(1);
      expect(history.rides[0].driver).toBeDefined();
      expect(history.rides[0].driver?.driverProfile?.vehicleMake).toBe('Hyundai');
    });

    it('generates itemized ride receipt with fare breakdown', async () => {
      const receipt = await rideService.getRideReceipt(
        testRide.id,
        testPassenger.id,
        'PASSENGER'
      );

      expect(receipt.receiptId).toContain('REC-');
      expect(receipt.rideId).toBe(testRide.id);
      expect(receipt.fareBreakdown).toBeDefined();
      expect(receipt.fareBreakdown.baseFare).toBe(80); // COMFORT base fare
      expect(receipt.fareBreakdown.distanceCharge).toBeGreaterThan(0);
      expect(receipt.finalFare).toBe(234);
      expect(receipt.driver?.firstName).toBe('Rajesh');
    });
  });

  describe('Ratings and Reviews', () => {
    it('submits a 5-star rating for a completed ride and updates driver rating', async () => {
      const rating = await rideService.submitRideRating(testRide.id, testPassenger.id, {
        score: 5,
        comment: 'Excellent trip TestReviewTag! Very clean vehicle and polite driver.',
        tags: ['Clean vehicle', 'Smooth driving', 'On time'],
      });

      expect(rating.id).toBeDefined();
      expect(rating.score).toBe(5);
      expect(rating.tags).toEqual(['Clean vehicle', 'Smooth driving', 'On time']);

      // Verify driver profile has updated average rating
      const driverProf = await prisma.driverProfile.findUnique({
        where: { userId: testDriver.id },
      });
      expect(driverProf?.rating).toBe(5.0);
      expect(driverProf?.ratingCount).toBe(1);
    });

    it('rejects duplicate ratings for the same completed ride', async () => {
      await expect(
        rideService.submitRideRating(testRide.id, testPassenger.id, {
          score: 4,
          comment: 'Duplicate attempt',
        })
      ).rejects.toThrow('This ride has already been rated');
    });

    it('rejects ratings with invalid scores (< 1 or > 5)', async () => {
      await expect(
        rideService.submitRideRating(testRide.id, testPassenger.id, {
          score: 6,
        })
      ).rejects.toThrow('Rating score must be an integer between 1 and 5');
    });
  });
});
