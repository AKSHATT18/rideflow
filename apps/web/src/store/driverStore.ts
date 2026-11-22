import { create } from 'zustand';
import { api } from '../lib/axios';

export interface DriverProfileData {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  accountStatus: string;
  createdAt: string;
  driverProfile: {
    id: string;
    licenseNumber?: string | null;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    vehiclePlate?: string | null;
    vehicleYear?: number | null;
    vehicleColor?: string | null;
    vehicleCategory: string;
    isVerified: boolean;
    rating: number;
    ratingCount: number;
    totalTrips: number;
    status: 'OFFLINE' | 'ONLINE' | 'BUSY';
  };
}

export interface DailyEarning {
  date: string;
  day: string;
  earnings: number;
  trips: number;
}

export interface RecentTrip {
  id: string;
  date: string;
  pickup: string;
  destination: string;
  vehicleType: string;
  totalFare: number;
  driverEarnings: number;
  platformCommission: number;
  distanceKm: number;
  durationMin: number;
}

export interface DriverEarningsData {
  lifetimeEarnings: number;
  todayEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  totalCompletedTrips: number;
  averageEarningsPerTrip: number;
  averageRating: number;
  commissionRate: number;
  payoutRate: number;
  dailyEarnings: DailyEarning[];
  recentTrips: RecentTrip[];
}

export interface DriverTripItem {
  id: string;
  status: string;
  pickupAddress: string;
  destinationAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  vehicleType: string;
  distanceKm: number;
  durationMin: number;
  totalFare: number;
  driverEarnings: number;
  platformCommission: number;
  passenger: {
    name: string;
    avatarUrl?: string | null;
  };
  rating?: {
    score: number;
    comment?: string | null;
    tags?: string[];
  } | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  requestedAt: string;
  acceptedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
}

interface DriverStore {
  profile: DriverProfileData | null;
  earnings: DriverEarningsData | null;
  trips: DriverTripItem[];
  tripsPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;

  // Modal open states
  isProfileModalOpen: boolean;
  isEarningsModalOpen: boolean;
  isHistoryModalOpen: boolean;

  setProfileModalOpen: (open: boolean) => void;
  setEarningsModalOpen: (open: boolean) => void;
  setHistoryModalOpen: (open: boolean) => void;

  fetchProfile: () => Promise<DriverProfileData | null>;
  updateProfile: (input: Partial<DriverProfileData['driverProfile'] & { firstName?: string; lastName?: string; phone?: string }>) => Promise<boolean>;
  fetchEarnings: () => Promise<DriverEarningsData | null>;
  fetchTrips: (params?: { status?: string; page?: number; limit?: number }) => Promise<void>;
}

export const useDriverStore = create<DriverStore>((set) => ({
  profile: null,
  earnings: null,
  trips: [],
  tripsPagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
  isLoading: false,
  error: null,

  isProfileModalOpen: false,
  isEarningsModalOpen: false,
  isHistoryModalOpen: false,

  setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
  setEarningsModalOpen: (open) => set({ isEarningsModalOpen: open }),
  setHistoryModalOpen: (open) => set({ isHistoryModalOpen: open }),

  fetchProfile: async () => {
    try {
      const res = await api.get('/driver/profile');
      const profile = res.data?.data?.profile || null;
      set({ profile });
      return profile;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch driver profile' });
      return null;
    }
  },

  updateProfile: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.put('/driver/profile', input);
      const updated = res.data?.data?.profile;
      if (updated) {
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updated } : updated,
          isLoading: false,
        }));
      }
      return true;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Failed to update profile',
      });
      return false;
    }
  },

  fetchEarnings: async () => {
    try {
      const res = await api.get('/driver/earnings');
      const earnings = res.data?.data?.earnings || null;
      set({ earnings });
      return earnings;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch earnings' });
      return null;
    }
  },

  fetchTrips: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/driver/trips', { params });
      set({
        trips: res.data?.data?.trips || [],
        tripsPagination: res.data?.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 },
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.message || 'Failed to fetch trip history',
      });
    }
  },
}));
