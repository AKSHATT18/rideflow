import { z } from 'zod';

export const createRideSchema = z.object({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  vehicleType: z.enum(['ECONOMY', 'COMFORT', 'PREMIUM']),
  estimatedDistanceKm: z.number().positive('Distance must be positive'),
  estimatedDurationMin: z.number().positive('Duration must be positive'),
  estimatedFare: z.number().optional(),
});

export type CreateRideInput = z.infer<typeof createRideSchema>;

export const locationUpdateSchema = z.object({
  rideId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.number().positive(),
});

export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
