import { create } from 'zustand';
import { api } from '../lib/axios';
import { connectSocket, disconnectSocket } from '../lib/socket';

export type Role = 'PASSENGER' | 'DRIVER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false });
    if (user) connectSocket(); else disconnectSocket();
  },
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const { data } = await api.get('/auth/me');
      set({ user: data.data.user, isAuthenticated: true, isLoading: false });
      connectSocket();
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      disconnectSocket();
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
      set({ user: null, isAuthenticated: false });
      disconnectSocket();
    } catch (error) {
      console.error('Logout failed', error);
    }
  }
}));
