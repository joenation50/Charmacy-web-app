/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { TawkChatWidget } from './components/TawkChatWidget';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTheme } from './hooks/useTheme';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { ContactPage } from './pages/ContactPage';
import { FaqPage } from './pages/FaqPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HomePage } from './pages/HomePage';
import { RiderPage } from './pages/RiderPage';
import { ServicesPage } from './pages/ServicesPage';
import { TrackPage } from './pages/TrackPage';

const RouteAuthGuard: React.FC = () => {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);
  const { logoutRider, logoutAdmin } = useAuth();

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      if (!pathname.startsWith('/rider')) {
        logoutRider();
      }
      if (!pathname.startsWith('/admin')) {
        logoutAdmin();
      }
      prevPathRef.current = pathname;
    }
  }, [pathname, logoutRider, logoutAdmin]);

  return null;
};

const AppShell: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isOnline = useOnlineStatus();

  return (
    <BrowserRouter>
      <RouteAuthGuard />
      <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-[#f4f5f7] dark:bg-[#0A0A0A] text-neutral-900 dark:text-white">
        <Navbar theme={theme} onToggleTheme={toggleTheme} />

        {/* Offline / Cached Tiles Fallback Strip */}
        {!isOnline && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2 text-center">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>
              Offline mode active — rendering cached OpenStreetMap tiles and queuing live GPS telemetry locally until back online.
            </span>
          </div>
        )}

        <main className="flex-1 w-full overflow-x-hidden">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/track" element={<TrackPage theme={theme} />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/rider" element={<RiderPage theme={theme} />} />
            <Route path="/admin" element={<AdminPage theme={theme} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <TawkChatWidget />
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
