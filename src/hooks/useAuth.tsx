import React, { createContext, useCallback, useContext, useState } from 'react';

const RIDER_PROFILE_KEY = 'cmRiderProfileV1';

export interface LocalRiderProfile {
  displayName: string;
  phone: string;
  bikePlate: string;
}

interface AuthContextValue {
  isRiderAuthed: boolean;
  isAdminAuthed: boolean;
  riderProfile: LocalRiderProfile;
  loginRider: (username: string, password: string) => boolean;
  logoutRider: () => void;
  loginAdmin: (username: string, password: string) => boolean;
  logoutAdmin: () => void;
  clearAllPortalAuth: () => void;
  updateRiderProfile: (updates: Partial<LocalRiderProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readRiderProfile(): LocalRiderProfile {
  try {
    const raw = localStorage.getItem(RIDER_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalRiderProfile>;
      return {
        displayName: parsed.displayName || '',
        phone: parsed.phone || '',
        bikePlate: parsed.bikePlate || '',
      };
    }
  } catch {
    // ignore storage errors
  }
  return { displayName: '', phone: '', bikePlate: '' };
}

// Clear any legacy persistent portal auth keys on load so switching or reloading always requires login
try {
  sessionStorage.removeItem('cmRiderAuth');
  sessionStorage.removeItem('cmAdminAuth');
} catch {
  // ignore
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Strictly in-memory per visit — never persists across page switches
  const [isRiderAuthed, setIsRiderAuthed] = useState(false);
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [riderProfile, setRiderProfile] = useState<LocalRiderProfile>(readRiderProfile);

  const loginRider = useCallback((username: string, password: string) => {
    const ok = username.trim().toLowerCase() === 'rider' && password === '1234';
    if (ok) {
      // Logging into Rider also ensures Admin auth is revoked
      setIsAdminAuthed(false);
      setIsRiderAuthed(true);
    }
    return ok;
  }, []);

  const logoutRider = useCallback(() => {
    setIsRiderAuthed(false);
  }, []);

  const loginAdmin = useCallback((username: string, password: string) => {
    const ok = username.trim().toLowerCase() === 'admin' && password === 'admin123';
    if (ok) {
      // Logging into Admin also ensures Rider auth is revoked
      setIsRiderAuthed(false);
      setIsAdminAuthed(true);
    }
    return ok;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthed(false);
  }, []);

  const clearAllPortalAuth = useCallback(() => {
    setIsRiderAuthed(false);
    setIsAdminAuthed(false);
  }, []);

  const updateRiderProfile = useCallback((updates: Partial<LocalRiderProfile>) => {
    setRiderProfile((prev) => {
      const next: LocalRiderProfile = {
        displayName: updates.displayName !== undefined ? updates.displayName : prev.displayName,
        phone: updates.phone !== undefined ? updates.phone : prev.phone,
        bikePlate: updates.bikePlate !== undefined ? updates.bikePlate : prev.bikePlate,
      };
      try {
        localStorage.setItem(RIDER_PROFILE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isRiderAuthed,
        isAdminAuthed,
        riderProfile,
        loginRider,
        logoutRider,
        loginAdmin,
        logoutAdmin,
        clearAllPortalAuth,
        updateRiderProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
