import React, { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';

interface AuthGateCardProps {
  title: string;
  subtitle: string;
  usernamePlaceholder?: string;
  onLogin: (username: string, password: string) => boolean;
}

export const AuthGateCard: React.FC<AuthGateCardProps> = ({
  title,
  subtitle,
  usernamePlaceholder = 'Enter username',
  onLogin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = onLogin(username, password);
    if (!ok) {
      setError('Incorrect username or password.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-7 shadow-2xl space-y-5"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full overflow-hidden border-2 border-[#FFC107] shadow-lg">
            <img
              src="/images/logo.jpg"
              alt="CharMary Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-neutral-900 dark:text-white pt-1">
            {title}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-500 text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={usernamePlaceholder}
              className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-3 text-sm focus:border-[#FFC107] focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFC107] text-[#0A0A0A] py-3 text-sm font-extrabold hover:bg-[#F2B705] transition-colors cursor-pointer shadow-lg shadow-[#FFC107]/20"
        >
          <LogIn className="w-4 h-4" />
          <span>Login</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 pt-1">
          <Lock className="w-3 h-3 text-[#FFC107]" />
          <span>Authorized CharMary portal access</span>
        </div>
      </form>
    </div>
  );
};
