import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bike,
  Box,
  ChevronDown,
  Compass,
  Headphones,
  HelpCircle,
  Home,
  Info,
  LayoutGrid,
  Menu,
  Moon,
  ShieldCheck,
  Star,
  Sun,
  X,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import type { ThemeMode } from '../hooks/useTheme';

interface NavbarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const PRIMARY_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/track', label: 'Track Order', icon: Compass },
  { to: '/rider', label: 'Rider Portal', icon: Bike },
  { to: '/admin', label: 'Admin', icon: ShieldCheck },
] as const;

const DASHBOARD_PAGES = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/track', label: 'Track Order', icon: Compass },
  { to: '/services', label: 'Services', icon: Box },
  { to: '/features', label: 'Why Choose Us', icon: Star },
  { to: '/about', label: 'About Us', icon: Info },
  { to: '/faq', label: 'FAQs', icon: HelpCircle },
  { to: '/contact', label: 'Contact Us', icon: Headphones },
  { to: '/rider', label: 'Rider Portal', icon: Bike },
  { to: '/admin', label: 'Admin Console', icon: ShieldCheck },
] as const;

export const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme }) => {
  const { pathname } = useLocation();
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDashboardOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <header className="sticky top-0 z-[900] border-b-2 border-[#FFC107] bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Brand */}
        <Link
          to="/"
          onClick={() => {
            setMobileOpen(false);
            setDashboardOpen(false);
          }}
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <img
            src="/images/logo.jpg"
            alt="CharMary Logo"
            className="w-10 h-10 rounded-full object-cover border-2 border-[#FFC107] shadow-sm group-hover:scale-105 transition-transform"
          />
          <div className="leading-none">
            <div className="font-display text-xl font-black tracking-tight text-neutral-900 dark:text-white">
              CHAR<span className="text-[#FFC107]">MARY</span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              Courier &amp; Logistics
            </div>
          </div>
        </Link>

        {/* Zone 2: Desktop Primary Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-1"
        >
          {PRIMARY_LINKS.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#FFC107] text-[#0A0A0A]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: PWA Install, Theme Toggle, Desktop Dashboard Menu, Mobile Drawer Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <PWAInstallButton />
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 rounded-full border border-neutral-300 dark:border-white/15 flex items-center justify-center text-[#FFC107] hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-700" />
            )}
          </button>

          {/* Desktop Dashboard / Pages Dropdown */}
          <div ref={dropdownRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setDashboardOpen((v) => !v)}
              aria-expanded={dashboardOpen}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFC107] text-[#0A0A0A] px-3.5 py-2 text-xs font-extrabold uppercase tracking-wide hover:bg-[#F2B705] transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Dashboard</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  dashboardOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dashboardOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-60 rounded-xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] shadow-2xl overflow-hidden divide-y divide-neutral-100 dark:divide-white/10 z-[950]">
                {DASHBOARD_PAGES.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setDashboardOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-[#FFC107]/15 text-[#FFC107] border-l-4 border-l-[#FFC107]'
                          : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-[#FFC107]'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#FFC107] shrink-0" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle dashboard navigation menu"
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center gap-1.5 rounded-lg bg-[#FFC107] text-[#0A0A0A] px-3 py-2 text-xs font-extrabold uppercase cursor-pointer"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>Menu</span>
          </button>
        </div>
      </div>

      {/* Mobile Full Dashboard Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0f1117] px-4 py-3 space-y-2.5 max-h-[80dvh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {DASHBOARD_PAGES.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    active
                      ? 'bg-[#FFC107] text-[#0A0A0A]'
                      : 'bg-neutral-100 dark:bg-white/5 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
          <div className="pt-2 border-t border-neutral-200 dark:border-white/10 flex justify-between items-center">
            <PWAInstallButton />
            <span className="text-[11px] text-neutral-500">Owerri &amp; Global Tracking</span>
          </div>
        </div>
      )}
    </header>
  );
};
