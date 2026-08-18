import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthCompany, AuthMembership, AuthUser } from '../types/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  activeCompany: AuthCompany | null;
  memberships: AuthMembership[];
  isAuthenticated: boolean;
  setAuth: (
    user: AuthUser,
    token: string,
    activeCompany: AuthCompany | null,
    memberships: AuthMembership[],
  ) => void;
  setToken: (token: string) => void;
  setActiveCompany: (company: AuthCompany | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      activeCompany: null,
      memberships: [],
      isAuthenticated: false,
      setAuth: (user, token, activeCompany, memberships) =>
        set({
          user,
          token,
          activeCompany,
          memberships,
          isAuthenticated: true,
        }),
      setToken: (token) => set({ token, isAuthenticated: Boolean(token) }),
      setActiveCompany: (activeCompany) => set({ activeCompany }),
      logout: () =>
        set({
          user: null,
          token: null,
          activeCompany: null,
          memberships: [],
          isAuthenticated: false,
        }),
    }),
    {
      name: 'hhs-erp-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        activeCompany: state.activeCompany,
        memberships: state.memberships,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
