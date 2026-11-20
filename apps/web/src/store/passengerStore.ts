import { create } from 'zustand';
import { api } from '../lib/axios';

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'HOME' | 'WORK' | 'FAVORITE' | 'RECENT';
}

export interface PassengerProfile {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  stats: {
    totalRides: number;
    completedRides: number;
    totalSpent: number;
    averageRatingGiven: number;
    totalReviewsGiven: number;
  };
}

interface PassengerStore {
  profile: PassengerProfile | null;
  savedLocations: SavedLocation[];
  history: any[];
  historyPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  isLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<PassengerProfile | null>;
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) => Promise<void>;
  fetchSavedLocations: () => Promise<SavedLocation[]>;
  addSavedLocation: (location: Omit<SavedLocation, 'id'>) => Promise<SavedLocation>;
  deleteSavedLocation: (id: string) => Promise<void>;
  fetchHistory: (filters?: { status?: string; page?: number; limit?: number }) => Promise<void>;
  fetchReceipt: (rideId: string) => Promise<any>;
  submitRating: (rideId: string, ratingData: { score: number; comment?: string; tags?: string[] }) => Promise<any>;
}

export const usePassengerStore = create<PassengerStore>((set, get) => ({
  profile: null,
  savedLocations: [],
  history: [],
  historyPagination: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.get('/passenger/profile');
      const profile = res.data.data.profile;
      set({ profile, isLoading: false });
      return profile;
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to fetch profile',
        isLoading: false,
      });
      return null;
    }
  },

  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      await api.put('/passenger/profile', data);
      await get().fetchProfile();
      set({ isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to update profile',
        isLoading: false,
      });
      throw err;
    }
  },

  fetchSavedLocations: async () => {
    try {
      const res = await api.get('/passenger/saved-locations');
      const savedLocations = res.data.data.locations;
      set({ savedLocations });
      return savedLocations;
    } catch (err: any) {
      console.error('Failed to fetch saved locations:', err);
      return [];
    }
  },

  addSavedLocation: async (location) => {
    const res = await api.post('/passenger/saved-locations', location);
    const created = res.data.data.location;
    await get().fetchSavedLocations();
    return created;
  },

  deleteSavedLocation: async (id) => {
    await api.delete(`/passenger/saved-locations/${id}`);
    await get().fetchSavedLocations();
  },

  fetchHistory: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      const res = await api.get(`/passenger/history?${params.toString()}`);
      set({
        history: res.data.data.rides,
        historyPagination: res.data.data.pagination,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.message || 'Failed to fetch ride history',
        isLoading: false,
      });
    }
  },

  fetchReceipt: async (rideId: string) => {
    const res = await api.get(`/rides/${rideId}/receipt`);
    return res.data.data.receipt;
  },

  submitRating: async (rideId, ratingData) => {
    const res = await api.post(`/rides/${rideId}/rate`, ratingData);
    await get().fetchHistory();
    return res.data.data.rating;
  },
}));
