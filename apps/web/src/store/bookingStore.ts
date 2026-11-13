import { create } from 'zustand';

export type BookingState = 
  | 'IDLE' 
  | 'SELECTING_PICKUP' 
  | 'SELECTING_DESTINATION' 
  | 'CALCULATING_ROUTE' 
  | 'ROUTE_READY' 
  | 'SELECTING_VEHICLE' 
  | 'READY_TO_REQUEST';

export interface Location {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

export interface RouteDetails {
  distanceKm: number;
  durationMin: number;
  distanceText: string;
  durationText: string;
}

interface BookingStore {
  state: BookingState;
  pickup: Location | null;
  destination: Location | null;
  routeDetails: RouteDetails | null;
  selectedVehicle: string | null;
  
  setState: (state: BookingState) => void;
  setPickup: (loc: Location | null) => void;
  setDestination: (loc: Location | null) => void;
  setRouteDetails: (details: RouteDetails | null) => void;
  setSelectedVehicle: (vehicleType: string | null) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingStore>((set) => ({
  state: 'IDLE',
  pickup: null,
  destination: null,
  routeDetails: null,
  selectedVehicle: null,
  
  setState: (state) => set({ state }),
  setPickup: (pickup) => set({ pickup }),
  setDestination: (destination) => set({ destination }),
  setRouteDetails: (routeDetails) => set({ routeDetails }),
  setSelectedVehicle: (selectedVehicle) => set({ selectedVehicle }),
  reset: () => set({
    state: 'IDLE',
    pickup: null,
    destination: null,
    routeDetails: null,
    selectedVehicle: null,
  }),
}));
