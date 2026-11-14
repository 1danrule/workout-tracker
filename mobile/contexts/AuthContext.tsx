import React, { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../services/api';
import type { Profile } from '../types';

interface AuthState {
  isLoading: boolean;
  isLoggedIn: boolean;
  profile: Profile | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      await api.loadTokens();
      const token = api.getAccessToken();
      if (token) {
        try {
          const p = await api.getProfile();
          setProfile(p);
          setIsLoggedIn(true);
        } catch {
          await api.clearTokens();
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string) => {
    await api.login(username, password);
    const p = await api.getProfile();
    setProfile(p);
    setIsLoggedIn(true);
  };

  const register = async (username: string, email: string, password: string) => {
    await api.register(username, email, password);
    await api.login(username, password);
    const p = await api.getProfile();
    setProfile(p);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await api.clearTokens();
    setProfile(null);
    setIsLoggedIn(false);
  };

  const refreshProfile = async () => {
    const p = await api.getProfile();
    setProfile(p);
  };

  return (
    <AuthContext.Provider value={{ isLoading, isLoggedIn, profile, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
