import { prisma } from '../utils/db';
import { AppError } from '../utils/AppError';
import { SavedLocationType, RideStatus } from '@prisma/client';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface CreateSavedLocationInput {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: SavedLocationType;
}

export interface UpdateSavedLocationInput {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  type?: SavedLocationType;
}

export interface RideHistoryFilters {
  status?: RideStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch passenger profile and ride statistics
 */
export const getPassengerProfile = async (userId: string) => {
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
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Aggregate passenger ride statistics
  const [totalRides, completedRidesAgg, ratingsAgg] = await Promise.all([
    prisma.ride.count({
      where: { passengerId: userId },
    }),
    prisma.ride.aggregate({
      where: {
        passengerId: userId,
        status: RideStatus.COMPLETED,
      },
      _sum: {
        finalFare: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.rating.aggregate({
      where: { passengerId: userId },
      _avg: {
        score: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  return {
    ...user,
    stats: {
      totalRides,
      completedRides: completedRidesAgg._count.id,
      totalSpent: completedRidesAgg._sum.finalFare || 0,
      averageRatingGiven: ratingsAgg._avg.score ? Number(ratingsAgg._avg.score.toFixed(1)) : 5.0,
      totalReviewsGiven: ratingsAgg._count.id,
    },
  };
};

/**
 * Update passenger profile information
 */
export const updatePassengerProfile = async (userId: string, data: UpdateProfileInput) => {
  const updateData: Record<string, any> = {};

  if (data.firstName !== undefined) updateData.firstName = data.firstName.trim();
  if (data.lastName !== undefined) updateData.lastName = data.lastName.trim();
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

  if (data.phone !== undefined) {
    const phone = data.phone.trim();
    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: {
        phone,
        NOT: { id: userId },
      },
    });
    if (existing) {
      throw new AppError('Phone number is already associated with another account', 409);
    }
    updateData.phone = phone;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });

  return updated;
};

/**
 * Get all saved locations for a passenger
 */
export const getSavedLocations = async (userId: string) => {
  return prisma.savedLocation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Add a new saved location (e.g. Home, Work, Favorite)
 */
export const createSavedLocation = async (userId: string, data: CreateSavedLocationInput) => {
  if (!data.name || !data.address || data.lat === undefined || data.lng === undefined) {
    throw new AppError('Name, address, latitude, and longitude are required', 400);
  }

  // If type is HOME or WORK, replace existing or update
  if (data.type === SavedLocationType.HOME || data.type === SavedLocationType.WORK) {
    const existing = await prisma.savedLocation.findFirst({
      where: {
        userId,
        type: data.type,
      },
    });

    if (existing) {
      return prisma.savedLocation.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          address: data.address,
          lat: data.lat,
          lng: data.lng,
        },
      });
    }
  }

  return prisma.savedLocation.create({
    data: {
      userId,
      name: data.name,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      type: data.type || SavedLocationType.FAVORITE,
    },
  });
};

/**
 * Update an existing saved location with ownership verification
 */
export const updateSavedLocation = async (
  userId: string,
  locationId: string,
  data: UpdateSavedLocationInput
) => {
  const existing = await prisma.savedLocation.findUnique({
    where: { id: locationId },
  });

  if (!existing) {
    throw new AppError('Saved location not found', 404);
  }

  if (existing.userId !== userId) {
    throw new AppError('Unauthorized to modify this location', 403);
  }

  return prisma.savedLocation.update({
    where: { id: locationId },
    data: {
      name: data.name ?? existing.name,
      address: data.address ?? existing.address,
      lat: data.lat ?? existing.lat,
      lng: data.lng ?? existing.lng,
      type: data.type ?? existing.type,
    },
  });
};

/**
 * Delete a saved location
 */
export const deleteSavedLocation = async (userId: string, locationId: string) => {
  const existing = await prisma.savedLocation.findUnique({
    where: { id: locationId },
  });

  if (!existing) {
    throw new AppError('Saved location not found', 404);
  }

  if (existing.userId !== userId) {
    throw new AppError('Unauthorized to delete this location', 403);
  }

  await prisma.savedLocation.delete({
    where: { id: locationId },
  });

  return { success: true };
};

/**
 * Fetch passenger ride history with pagination and status/date filtering
 */
export const getPassengerRideHistory = async (userId: string, filters: RideHistoryFilters) => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause: Record<string, any> = {
    passengerId: userId,
  };

  if (filters.status) {
    whereClause.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    whereClause.createdAt = {};
    if (filters.startDate) {
      whereClause.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      whereClause.createdAt.lte = new Date(filters.endDate);
    }
  }

  const [total, rides] = await Promise.all([
    prisma.ride.count({ where: whereClause }),
    prisma.ride.findMany({
      where: whereClause,
      include: {
        driver: {
          select: {
            id: true,
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
        rating: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    rides,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
