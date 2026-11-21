import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../utils/db';
import * as rideService from '../services/rideService';
import { RideStatus } from '@prisma/client';
import { hashOTP, encryptOTP } from '../utils/otp';

describe('Milestone 5.2: Secure OTP Ride Verification', () => {
  let passengerA: any;
  let passengerB: any;
  let driverA: any;
  let driverB: any;
  let ride: any;

  beforeAll(async () => {
    const timestamp = Date.now();

    // Create passenger A & B
    passengerA = await prisma.user.create({
      data: {
        email: `pass_otp_a_${timestamp}@test.com`,
        phone: `+9191000${String(timestamp).slice(-5)}`,
        firstName: 'Ananya',
        lastName: 'Iyer',
        passwordHash: 'dummy',
        role: 'PASSENGER',
      },
    });

    passengerB = await prisma.user.create({
      data: {
        email: `pass_otp_b_${timestamp}@test.com`,
        phone: `+9191100${String(timestamp).slice(-5)}`,
        firstName: 'Bob',
        lastName: 'Sarker',
        passwordHash: 'dummy',
        role: 'PASSENGER',
      },
    });

    // Create driver A & B
    driverA = await prisma.user.create({
      data: {
        email: `driver_otp_a_${timestamp}@test.com`,
        phone: `+9191200${String(timestamp).slice(-5)}`,
        firstName: 'Suresh',
        lastName: 'Reddy',
        passwordHash: 'dummy',
        role: 'DRIVER',
        driverProfile: {
          create: {
            licenseNumber: 'KA-01-OTP-1',
            vehicleMake: 'Maruti',
            vehicleModel: 'Dzire',
            vehiclePlate: 'KA01DZ1234',
            status: 'ONLINE',
          },
        },
      },
      include: { driverProfile: true },
    });

    driverB = await prisma.user.create({
      data: {
        email: `driver_otp_b_${timestamp}@test.com`,
        phone: `+9191300${String(timestamp).slice(-5)}`,
        firstName: 'Vikram',
        lastName: 'Singh',
        passwordHash: 'dummy',
        role: 'DRIVER',
        driverProfile: {
          create: {
            licenseNumber: 'KA-01-OTP-2',
            vehicleMake: 'Tata',
            vehicleModel: 'Tigor',
            vehiclePlate: 'KA01TG5678',
            status: 'ONLINE',
          },
        },
      },
      include: { driverProfile: true },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (ride) {
      await prisma.rideOTP.deleteMany({ where: { rideId: ride.id } });
      await prisma.ride.deleteMany({ where: { id: ride.id } });
    }
    await prisma.driverProfile.deleteMany({
      where: { userId: { in: [driverA.id, driverB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [passengerA.id, passengerB.id, driverA.id, driverB.id] } },
    });
  });

  it('generates a secure 4-digit OTP upon driver acceptance', async () => {
    // 1. Create ride in SEARCHING status
    ride = await rideService.createRide(passengerA.id, {
      pickupLat: 12.9716,
      pickupLng: 77.5946,
      pickupAddress: 'MG Road Metro Station',
      destinationLat: 12.9352,
      destinationLng: 77.6245,
      destinationAddress: 'Koramangala 4th Block',
      vehicleType: 'ECONOMY',
      estimatedDistanceKm: 7.2,
      estimatedDurationMin: 22,
    });

    expect(ride.status).toBe('SEARCHING');

    // 2. Driver A accepts ride
    const accepted = await rideService.acceptRide(ride.id, driverA.id);
    expect(accepted?.status).toBe('DRIVER_ASSIGNED');

    // 3. Verify RideOTP record was created in DB with encrypted & hashed fields
    const otpRecord = await prisma.rideOTP.findUnique({
      where: { rideId: ride.id },
    });

    expect(otpRecord).toBeDefined();
    expect(otpRecord?.otpHash).toBeDefined();
    expect(otpRecord?.encryptedOtp).toBeDefined();
    expect(otpRecord?.verifiedAt).toBeNull();
    expect(otpRecord?.attempts).toBe(0);
    expect(otpRecord?.maxAttempts).toBe(3);
    expect(new Date(otpRecord!.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('allows ONLY the authorized passenger to retrieve the plain OTP', async () => {
    // Passenger A can view OTP
    const otpData = await rideService.getRideOTP(ride.id, passengerA.id, 'PASSENGER');
    expect(otpData.otp).toHaveLength(4);
    expect(otpData.isVerified).toBe(false);
    expect(otpData.attemptsRemaining).toBe(3);

    // Passenger B cannot view OTP
    await expect(
      rideService.getRideOTP(ride.id, passengerB.id, 'PASSENGER')
    ).rejects.toThrow('Unauthorized');

    // Driver cannot view OTP directly
    await expect(
      rideService.getRideOTP(ride.id, driverA.id, 'DRIVER')
    ).rejects.toThrow('Unauthorized');
  });

  it('rejects OTP verification before driver marks ARRIVED', async () => {
    // Current status is DRIVER_ASSIGNED
    await expect(
      rideService.verifyRideOTP(ride.id, driverA.id, '1234')
    ).rejects.toThrow('Driver must mark arrived first');
  });

  it('rejects trip start via startRide without OTP verification', async () => {
    // Mark driver arrived
    await rideService.markDriverArrived(ride.id, driverA.id);

    // Attempting startRide without OTP verification should fail
    await expect(
      rideService.startRide(ride.id, driverA.id)
    ).rejects.toThrow('without passenger OTP verification');
  });

  it('rejects unauthorized driver attempting verification', async () => {
    await expect(
      rideService.verifyRideOTP(ride.id, driverB.id, '1234')
    ).rejects.toThrow('Unauthorized');
  });

  it('increments failed attempts on incorrect OTP and locks after 3 attempts', async () => {
    const otpData = await rideService.getRideOTP(ride.id, passengerA.id, 'PASSENGER');
    const validOtp = otpData.otp;
    const invalidOtp = validOtp === '1111' ? '2222' : '1111';

    // Attempt 1: Failed
    await expect(
      rideService.verifyRideOTP(ride.id, driverA.id, invalidOtp)
    ).rejects.toThrow('2 attempt(s) remaining');

    // Attempt 2: Failed
    await expect(
      rideService.verifyRideOTP(ride.id, driverA.id, invalidOtp)
    ).rejects.toThrow('1 attempt(s) remaining');

    // Attempt 3: Failed -> Locks verification
    await expect(
      rideService.verifyRideOTP(ride.id, driverA.id, invalidOtp)
    ).rejects.toThrow('Maximum verification attempts exceeded');

    // 4th attempt: Immediately rejected
    await expect(
      rideService.verifyRideOTP(ride.id, driverA.id, validOtp)
    ).rejects.toThrow('Maximum verification attempts exceeded');
  });

  it('rejects expired OTPs', async () => {
    // Reset attempts and expire OTP for testing
    await prisma.rideOTP.update({
      where: { rideId: ride.id },
      data: {
        attempts: 0,
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
      },
    });

    const otpData = await rideService.getRideOTP(ride.id, passengerA.id, 'PASSENGER');
    await expect(
      rideService.verifyRideOTP(ride.id, driverA.id, otpData.otp)
    ).rejects.toThrow('Pickup OTP has expired');
  });

  it('successfully verifies correct OTP, marks verifiedAt, and transitions ride to IN_PROGRESS', async () => {
    // Reset expiration and attempts to valid state
    await prisma.rideOTP.update({
      where: { rideId: ride.id },
      data: {
        attempts: 0,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const otpData = await rideService.getRideOTP(ride.id, passengerA.id, 'PASSENGER');
    const validOtp = otpData.otp;

    const verifiedRide = await rideService.verifyRideOTP(ride.id, driverA.id, validOtp);

    expect(verifiedRide.status).toBe('IN_PROGRESS');
    expect(verifiedRide.startedAt).toBeDefined();

    // Verify RideOTP record is marked verified
    const updatedOTP = await prisma.rideOTP.findUnique({ where: { rideId: ride.id } });
    expect(updatedOTP?.verifiedAt).not.toBeNull();

    // Verify driver profile is BUSY
    const driverProf = await prisma.driverProfile.findUnique({ where: { userId: driverA.id } });
    expect(driverProf?.status).toBe('BUSY');
  });

  it('prevents OTP reuse once already verified', async () => {
    const otpData = await rideService.getRideOTP(ride.id, passengerA.id, 'PASSENGER');
    expect(otpData.isVerified).toBe(true);

    // Attempting to verify again
    await expect(
      rideService.verifyRideOTP(ride.id, driverA.id, otpData.otp)
    ).rejects.toThrow('Cannot verify OTP from current status');
  });
});
