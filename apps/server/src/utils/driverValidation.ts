import { z } from 'zod';

export const updateDriverProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50).optional(),
  lastName: z.string().min(1, 'Last name is required').max(50).optional(),
  phone: z.string().min(5, 'Valid phone number is required').max(20).optional(),
  licenseNumber: z.string().min(3, 'Valid license number is required').max(50).optional(),
  vehicleMake: z.string().min(1, 'Vehicle make is required').max(50).optional(),
  vehicleModel: z.string().min(1, 'Vehicle model is required').max(50).optional(),
  vehiclePlate: z.string().min(1, 'Vehicle registration plate is required').max(30).optional(),
  vehicleYear: z.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
  vehicleColor: z.string().min(1, 'Vehicle color is required').max(30).optional(),
  vehicleCategory: z.enum(['ECONOMY', 'COMFORT', 'PREMIUM']).optional(),
});

export type UpdateDriverProfileInput = z.infer<typeof updateDriverProfileSchema>;

export const updateDriverAvailabilitySchema = z.object({
  status: z.enum(['ONLINE', 'OFFLINE']),
});

export type UpdateDriverAvailabilityInput = z.infer<typeof updateDriverAvailabilitySchema>;

export const driverTripsQuerySchema = z.object({
  status: z.enum([
    'ALL',
    'REQUESTED',
    'SEARCHING',
    'DRIVER_ASSIGNED',
    'DRIVER_ARRIVING',
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ]).optional().default('ALL'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type DriverTripsQueryInput = z.infer<typeof driverTripsQuerySchema>;
