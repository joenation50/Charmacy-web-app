import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Headphones } from 'lucide-react';

const TAWK_EMBED_URL = 'https://embed.tawk.to/6afc81888e6f59d4de4962ad/default';
const TAWK_DIRECT_CHAT_URL = 'https://tawk.to/chat/6afc81888e6f59d4de4962ad/default';

declare global {
  interface Window {
    Tawk_API?: {
      onLoad?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      maximize?: () => void;
      customStyle?: Record<string, unknown>;
    };
    Tawk_LoadStart?: Date;
    $_Tawk?: {
      init?: boolean;
      ready?: boolean;
    };
  }
}

function hasTawkDomWidget(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector(
      'iframe[src*="tawk.to"], iframe[title*="chat" i], .widget-visible, #tawk-bubble-container'
    )
  );
}

export const TawkChatWidget: React.FC = () => {
  const { pathname } = useLocation();
  const [tawkReady, setTawkReady] = useState<boolean>(() => hasTawkDomWidget());
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

    const prevOnLoad = window.Tawk_API.onLoad;
    window.Tawk_API.onLoad = () => {
      try {
        prevOnLoad?.();
        window.Tawk_API?.showWidget?.();
      } catch {
        // ignore widget API timing errors
      }
      setTawkReady(true);
      setShowFallback(false);
    };

    const markReadyIfMounted = () => {
      if (hasTawkDomWidget()) {
        setTawkReady(true);
        setShowFallback(false);
        try {
          window.Tawk_API?.showWidget?.();
        } catch {
          // ignore
        }
        return true;
      }
      return false;
    };

    // Ensure script exists even if cached shell missed it
    const existingScript =
      document.getElementById('charmary-tawk-script') ||
      document.querySelector(`script[src="${TAWK_EMBED_URL}"]`);

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'charmary-tawk-script';
      script.async = true;
      script.src = TAWK_EMBED_URL;
      script.charset = 'UTF-8';
      script.onerror = () => {
        setShowFallback(true);
      };
      (document.head || document.body || document.documentElement).appendChild(script);
    } else {
      existingScript.addEventListener(
        'error',
        () => {
          setShowFallback(true);
        },
        { once: true }
      );
    }

    if (markReadyIfMounted()) return;

    const observer = new MutationObserver(() => {
      if (markReadyIfMounted()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const fallbackTimer = window.setTimeout(() => {
      if (!markReadyIfMounted()) {
        setShowFallback(true);
      }
    }, 4500);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  // Keep Tawk widget visible across SPA route transitions
  useEffect(() => {
    if (hasTawkDomWidget()) {
      setTawkReady(true);
      setShowFallback(false);
      try {
        window.Tawk_API?.showWidget?.();
      } catch {
        // ignore
      }
    }
  }, [pathname]);

  // Only show direct Tawk.to launcher if embed script was blocked/delayed in browser
  if (tawkReady || !showFallback) {
    return null;
  }

  return (
    <a
      href={TAWK_DIRECT_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open CharMary Live Support Chat (Tawk.to)"
      title="Live Support Chat"
      className="fixed bottom-5 right-5 z-[850] inline-flex items-center gap-2 rounded-full bg-[#FFC107] text-[#0A0A0A] px-4 py-3 text-xs sm:text-sm font-extrabold shadow-xl shadow-[#FFC107]/30 border-2 border-[#0A0A0A]/15 hover:bg-[#F2B705] hover:scale-105 transition-all"
    >
      <Headphones className="w-5 h-5 shrink-0" />
      <span>Live Chat</span>
    </a>
  );
};
