import { create } from 'zustand';
import { getSocket } from '../lib/socket';
import { api } from '../lib/axios';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface DriverProfileInfo {
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehiclePlate?: string | null;
  rating?: number | null;
}

export interface DriverInfo {
  firstName: string;
  lastName: string;
  phone?: string | null;
  driverProfile?: DriverProfileInfo | null;
}

export interface RideData {
  id: string;
  status: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  vehicleType: string;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  estimatedFare: number;
  finalFare?: number | null;
  driver?: DriverInfo | null;
  passenger?: {
    firstName: string;
    lastName: string;
    phone?: string;
  } | null;
}

interface RideStore {
  activeRideId: string | null;
  status: string | null;
  activeRide: RideData | null;
  driverLocation: DriverLocation | null;
  isConnected: boolean;

  setActiveRide: (rideId: string, status: string, rideData?: RideData | null) => void;
  setStatus: (status: string) => void;
  setDriverLocation: (location: DriverLocation) => void;
  clearRide: () => void;
  joinRideRoom: (rideId: string) => void;
  leaveRideRoom: (rideId: string) => void;
  fetchActiveRide: () => Promise<RideData | null>;
}

export const useRideStore = create<RideStore>((set, get) => ({
  activeRideId: null,
  status: null,
  activeRide: null,
  driverLocation: null,
  isConnected: false,

  setActiveRide: (activeRideId, status, activeRide = null) =>
    set({ activeRideId, status, ...(activeRide ? { activeRide } : {}) }),

  setStatus: (status) => set({ status }),
  setDriverLocation: (driverLocation) => set({ driverLocation }),

  clearRide: () =>
    set({
      activeRideId: null,
      status: null,
      activeRide: null,
      driverLocation: null,
    }),

  joinRideRoom: (rideId: string) => {
    const socket = getSocket();

    const updateConnection = () => set({ isConnected: socket.connected });
    socket.on('connect', updateConnection);
    socket.on('disconnect', updateConnection);
    updateConnection();

    socket.emit('ride:join', rideId);

    // Listen for real-time ride status transitions
    socket.on('ride:status', (payload: { status: string; ride?: RideData }) => {
      set((state) => ({
        status: payload.status,
        activeRide: payload.ride ? payload.ride : state.activeRide,
      }));
    });

    // Listen for ride pickup verified event
    socket.on(
      'ride:pickup_verified',
      (payload: { rideId: string; status: string; verifiedAt: string }) => {
        set((state) => ({
          status: payload.status,
          activeRide: state.activeRide
            ? { ...state.activeRide, status: payload.status }
            : state.activeRide,
        }));
      }
    );

    // Listen for live driver GPS location updates
    socket.on(
      'ride:location',
      (payload: { latitude: number; longitude: number; timestamp: number }) => {
        set({
          driverLocation: {
            latitude: payload.latitude,
            longitude: payload.longitude,
            timestamp: payload.timestamp,
          },
        });
      }
    );
  },

  leaveRideRoom: (rideId: string) => {
    const socket = getSocket();
    socket.emit('ride:leave', rideId);
    socket.off('ride:status');
    socket.off('ride:pickup_verified');
    socket.off('ride:location');
  },

  fetchActiveRide: async () => {
    try {
      const response = await api.get('/rides/active');
      const ride: RideData | null = response.data?.data?.ride || null;
      if (ride) {
        set({
          activeRideId: ride.id,
          status: ride.status,
          activeRide: ride,
        });
        get().joinRideRoom(ride.id);
      }
      return ride;
    } catch (error) {
      return null;
    }
  },
}));
