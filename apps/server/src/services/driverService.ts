import { prisma } from '../utils/db';
import { AppError } from '../utils/AppError';
import { UpdateDriverProfileInput, DriverTripsQueryInput } from '../utils/driverValidation';
import { RideStatus } from '@prisma/client';

export const DRIVER_PAYOUT_RATE = 0.80; // 80% to driver, 20% platform commission

/**
 * Calculates driver payout from final passenger fare
 */
export const calculateDriverEarnings = (fare: number): number => {
  return Math.round(fare * DRIVER_PAYOUT_RATE * 100) / 100;
};

/**
 * Calculates platform commission fee from final passenger fare
 */
export const calculatePlatformFee = (fare: number): number => {
  const driverEarnings = calculateDriverEarnings(fare);
  return Math.round((fare - driverEarnings) * 100) / 100;
};

/**
 * Fetch authenticated driver's full profile, vehicle details, and ratings
 */
export const getDriverProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatarUrl: true,
      createdAt: true,
      driverProfile: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role !== 'DRIVER' || !user.driverProfile) {
    throw new AppError('Driver profile not found', 404);
  }

  // Calculate live trip statistics
  const completedTripsCount = await prisma.ride.count({
    where: { driverId: userId, status: RideStatus.COMPLETED },
  });

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    accountStatus: user.status,
    createdAt: user.createdAt,
    driverProfile: {
      ...user.driverProfile,
      totalTrips: completedTripsCount,
    },
  };
};

/**
 * Update permitted driver personal and vehicle details
 * Strictly rejects modification of protected fields (rating, verification, totalTrips, role)
 */
export const updateDriverProfile = async (userId: string, input: UpdateDriverProfileInput) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driverProfile: true },
  });

  if (!user || user.role !== 'DRIVER' || !user.driverProfile) {
    throw new AppError('Driver profile not found', 404);
  }

  // Ensure vehicle registration plate is not already assigned to another active driver profile
  if (input.vehiclePlate) {
    const normalizedPlate = input.vehiclePlate.trim().toUpperCase();
    const existingPlate = await prisma.driverProfile.findFirst({
      where: {
        vehiclePlate: { equals: normalizedPlate, mode: 'insensitive' },
        userId: { not: userId },
      },
    });

    if (existingPlate) {
      throw new AppError('This vehicle registration plate is already registered to another driver', 409);
    }
  }

  // Atomically update user and driver profile
  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update user fields if provided
    if (input.firstName || input.lastName || input.phone) {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(input.firstName ? { firstName: input.firstName.trim() } : {}),
          ...(input.lastName ? { lastName: input.lastName.trim() } : {}),
          ...(input.phone ? { phone: input.phone.trim() } : {}),
        },
      });
    }

    // 2. Update driver profile fields
    const updatedProfile = await tx.driverProfile.update({
      where: { userId },
      data: {
        ...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber?.trim() } : {}),
        ...(input.vehicleMake !== undefined ? { vehicleMake: input.vehicleMake?.trim() } : {}),
        ...(input.vehicleModel !== undefined ? { vehicleModel: input.vehicleModel?.trim() } : {}),
        ...(input.vehiclePlate !== undefined ? { vehiclePlate: input.vehiclePlate?.trim().toUpperCase() } : {}),
        ...(input.vehicleYear !== undefined ? { vehicleYear: input.vehicleYear } : {}),
        ...(input.vehicleColor !== undefined ? { vehicleColor: input.vehicleColor?.trim() } : {}),
        ...(input.vehicleCategory !== undefined ? { vehicleCategory: input.vehicleCategory } : {}),
      },
    });

    const updatedUser = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        status: true,
        avatarUrl: true,
      },
    });

    return {
      ...updatedUser,
      driverProfile: updatedProfile,
    };
  });

  return updated;
};

/**
 * Manage driver online/offline availability state
 * Prevents going offline while an active trip is in progress
 * Prevents suspended or unverified drivers from going online
 */
export const updateDriverAvailability = async (userId: string, newStatus: 'ONLINE' | 'OFFLINE') => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driverProfile: true },
  });

  if (!user || user.role !== 'DRIVER' || !user.driverProfile) {
    throw new AppError('Driver profile not found', 404);
  }

  // Check account suspension
  if (user.status === 'SUSPENDED') {
    throw new AppError('Suspended drivers cannot update availability or accept rides', 403);
  }

  // Check driver verification
  if (!user.driverProfile.isVerified) {
    throw new AppError('Unverified drivers cannot go online or accept rides', 403);
  }

  // When going offline, verify no active ride is currently in progress
  if (newStatus === 'OFFLINE') {
    const activeRide = await prisma.ride.findFirst({
      where: {
        driverId: userId,
        status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
      },
    });

    if (activeRide) {
      throw new AppError('Cannot go offline while an active trip is in progress', 400);
    }
  }

  const updatedProfile = await prisma.driverProfile.update({
    where: { userId },
    data: { status: newStatus },
  });

  return {
    status: updatedProfile.status,
    isAvailable: updatedProfile.status === 'ONLINE',
    driver: updatedProfile,
  };
};

/**
 * Compute real driver earnings, breakdowns, and 7-day trend
 */
export const getDriverEarnings = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driverProfile: true },
  });

  if (!user || user.role !== 'DRIVER' || !user.driverProfile) {
    throw new AppError('Driver profile not found', 404);
  }

  // Fetch all completed rides for this driver
  const completedRides = await prisma.ride.findMany({
    where: {
      driverId: userId,
      status: RideStatus.COMPLETED,
    },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      pickupAddress: true,
      destinationAddress: true,
      vehicleType: true,
      finalFare: true,
      estimatedFare: true,
      completedAt: true,
      estimatedDistanceKm: true,
      estimatedDurationMin: true,
    },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let lifetimeEarnings = 0;
  let todayEarnings = 0;
  let thisWeekEarnings = 0;
  let thisMonthEarnings = 0;

  completedRides.forEach((ride) => {
    const fare = ride.finalFare || ride.estimatedFare || 0;
    const earnings = calculateDriverEarnings(fare);
    lifetimeEarnings += earnings;

    const rideDate = ride.completedAt ? new Date(ride.completedAt) : new Date();
    if (rideDate >= startOfToday) {
      todayEarnings += earnings;
    }
    if (rideDate >= startOfWeek) {
      thisWeekEarnings += earnings;
    }
    if (rideDate >= startOfMonth) {
      thisMonthEarnings += earnings;
    }
  });

  lifetimeEarnings = Math.round(lifetimeEarnings * 100) / 100;
  todayEarnings = Math.round(todayEarnings * 100) / 100;
  thisWeekEarnings = Math.round(thisWeekEarnings * 100) / 100;
  thisMonthEarnings = Math.round(thisMonthEarnings * 100) / 100;

  const totalCompletedTrips = completedRides.length;
  const averageEarningsPerTrip =
    totalCompletedTrips > 0 ? Math.round((lifetimeEarnings / totalCompletedTrips) * 100) / 100 : 0;

  // Compute 7-day daily breakdown for charting
  const dailyEarningsMap: Record<string, { earnings: number; trips: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    dailyEarningsMap[dateStr] = { earnings: 0, trips: 0 };
  }

  completedRides.forEach((ride) => {
    if (ride.completedAt) {
      const dateStr = new Date(ride.completedAt).toISOString().split('T')[0];
      if (dailyEarningsMap[dateStr]) {
        const fare = ride.finalFare || ride.estimatedFare || 0;
        dailyEarningsMap[dateStr].earnings += calculateDriverEarnings(fare);
        dailyEarningsMap[dateStr].trips += 1;
      }
    }
  });

  const dailyEarnings = Object.entries(dailyEarningsMap).map(([date, data]) => ({
    date,
    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    earnings: Math.round(data.earnings * 100) / 100,
    trips: data.trips,
  }));

  // Itemized recent trips
  const recentTrips = completedRides.slice(0, 10).map((ride) => {
    const totalFare = ride.finalFare || ride.estimatedFare || 0;
    const driverEarnings = calculateDriverEarnings(totalFare);
    const platformCommission = calculatePlatformFee(totalFare);

    return {
      id: ride.id,
      date: ride.completedAt,
      pickup: ride.pickupAddress,
      destination: ride.destinationAddress,
      vehicleType: ride.vehicleType,
      totalFare,
      driverEarnings,
      platformCommission,
      distanceKm: ride.estimatedDistanceKm,
      durationMin: ride.estimatedDurationMin,
    };
  });

  return {
    lifetimeEarnings,
    todayEarnings,
    thisWeekEarnings,
    thisMonthEarnings,
    totalCompletedTrips,
    averageEarningsPerTrip,
    averageRating: user.driverProfile.rating,
    commissionRate: Math.round((1 - DRIVER_PAYOUT_RATE) * 100) / 100, // 0.20 (20%)
    payoutRate: DRIVER_PAYOUT_RATE, // 0.80 (80%)
    dailyEarnings,
    recentTrips,
  };
};

/**
 * Fetch paginated driver trip history with status and date filters
 */
export const getDriverTrips = async (userId: string, query: DriverTripsQueryInput) => {
  const { status, startDate, endDate, page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  // Build where clause strictly enforcing driver ownership
  const where: any = {
    driverId: userId,
  };

  if (status && status !== 'ALL') {
    where.status = status as RideStatus;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [total, rides] = await Promise.all([
    prisma.ride.count({ where }),
    prisma.ride.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        passenger: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        rating: {
          select: {
            score: true,
            comment: true,
            tags: true,
          },
        },
      },
    }),
  ]);

  const trips = rides.map((ride) => {
    const totalFare = ride.finalFare || ride.estimatedFare || 0;
    const isCompleted = ride.status === RideStatus.COMPLETED;
    const driverEarnings = isCompleted ? calculateDriverEarnings(totalFare) : 0;
    const platformCommission = isCompleted ? calculatePlatformFee(totalFare) : 0;

    return {
      id: ride.id,
      status: ride.status,
      pickupAddress: ride.pickupAddress,
      destinationAddress: ride.destinationAddress,
      pickupLat: ride.pickupLat,
      pickupLng: ride.pickupLng,
      destinationLat: ride.destinationLat,
      destinationLng: ride.destinationLng,
      vehicleType: ride.vehicleType,
      distanceKm: ride.estimatedDistanceKm,
      durationMin: ride.estimatedDurationMin,
      totalFare,
      driverEarnings,
      platformCommission,
      passenger: {
        name: `${ride.passenger.firstName} ${ride.passenger.lastName ? ride.passenger.lastName[0] + '.' : ''}`,
        avatarUrl: ride.passenger.avatarUrl,
      },
      rating: ride.rating || null,
      cancellationReason: ride.cancellationReason,
      cancelledBy: ride.cancelledBy,
      requestedAt: ride.requestedAt,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
    };
  });

  return {
    trips,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};
