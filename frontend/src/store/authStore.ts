import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserInfo } from '../api';

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  setAuth: (token: string, user: UserInfo) => void;
  setUser: (user: UserInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'recycling-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
