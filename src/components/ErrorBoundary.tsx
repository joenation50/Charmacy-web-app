import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    let display = this.state.message;
    try {
      const parsed = JSON.parse(this.state.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed.error) {
        display = `${parsed.error}${parsed.path ? ` (${parsed.operationType} on ${parsed.path})` : ''}`;
      }
    } catch {
      // plain string
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white p-6">
        <div className="max-w-md w-full rounded-2xl border border-white/15 bg-[#12141a] p-6 space-y-4">
          <div className="flex items-center gap-3 text-amber-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed break-words">{display}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FFC107] text-[#0A0A0A] px-4 py-2.5 text-sm font-bold hover:bg-[#F2B705] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      </div>
    );
  }
}
