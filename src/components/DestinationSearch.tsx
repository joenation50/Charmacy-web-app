import React, { useEffect, useRef, useState } from 'react';
import { Globe, Loader2, MapPin, Search, X } from 'lucide-react';
import { type GlobalPlaceMatch, parseCoordinateInput, searchGlobalPlaces } from '../lib/geo';
import type { DestinationSelection } from '../types/tracking';

interface DestinationSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectDestination: (dest: DestinationSelection) => void;
  disabled?: boolean;
  pinnedCoords?: { lat: number; lng: number } | null;
}

export const DestinationSearch: React.FC<DestinationSearchProps> = ({
  value,
  onChangeText,
  onSelectDestination,
  disabled = false,
  pinnedCoords,
}) => {
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const skipNextAutoSearchRef = useRef(false);

  const [candidates, setCandidates] = useState<GlobalPlaceMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      return;
    }

    if (trimmed.length < 2) {
      setCandidates([]);
      setIsOpen(false);
      setSearchError(null);
      return;
    }

    const directCoords = parseCoordinateInput(trimmed);
    if (directCoords) {
      setCandidates([
        {
          id: `coords-${directCoords.lat}-${directCoords.lng}`,
          title: `Pinned Coordinates (${directCoords.lat.toFixed(5)}, ${directCoords.lng.toFixed(5)})`,
          subtitle: 'Direct global latitude / longitude or map link',
          source: 'coords',
          coords: directCoords,
        },
      ]);
      setIsOpen(true);
      setSearchError(null);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      if (!navigator.onLine) {
        setSearchError('Offline: enter coordinates (e.g. 6.5244, 3.3792) or tap the map.');
        setIsLoading(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setSearchError(null);

      try {
        const merged = await searchGlobalPlaces(trimmed, controller.signal);
        if (controller.signal.aborted) return;
        setCandidates(merged);
        setIsOpen(merged.length > 0);
        if (merged.length === 0) {
          setSearchError('No matching global places found. Add city/country or tap the map to pin.');
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setSearchError('Search temporarily unavailable. Paste coordinates or tap the map.');
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [value]);

  const handlePickCandidate = (candidate: GlobalPlaceMatch) => {
    const label =
      candidate.source === 'coords'
        ? `${candidate.coords.lat.toFixed(5)}, ${candidate.coords.lng.toFixed(5)}`
        : [candidate.title, candidate.subtitle].filter(Boolean).join(', ');

    skipNextAutoSearchRef.current = true;
    onChangeText(label);
    onSelectDestination({
      lat: candidate.coords.lat,
      lng: candidate.coords.lng,
      address: label,
    });
    setIsOpen(false);
    setSearchError(null);
  };

  const handleFindAndPin = async () => {
    const trimmed = value.trim();
    if (trimmed.length < 2 || disabled) return;

    if (candidates.length > 0) {
      handlePickCandidate(candidates[0]);
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    try {
      const merged = await searchGlobalPlaces(trimmed);
      setCandidates(merged);
      if (merged.length > 0) {
        handlePickCandidate(merged[0]);
      } else {
        setSearchError('No matching places found. Try including city/country or tap the map.');
      }
    } catch {
      setSearchError('Unable to reach search service right now. Tap the map to pin directly.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={value}
            disabled={disabled}
            onFocus={() => candidates.length > 0 && setIsOpen(true)}
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleFindAndPin();
              }
            }}
            placeholder="Search any global address, landmark, city, or lat,lng..."
            className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] pl-10 pr-9 py-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-[#FFC107] focus:outline-none focus:ring-2 focus:ring-[#FFC107]/25 disabled:opacity-50"
          />
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-[#FFC107] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          ) : (
            value &&
            !disabled && (
              <button
                type="button"
                onClick={() => {
                  onChangeText('');
                  setCandidates([]);
                  setIsOpen(false);
                  setSearchError(null);
                }}
                aria-label="Clear destination search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleFindAndPin()}
          disabled={disabled || isLoading || value.trim().length < 2}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FFC107] text-[#0A0A0A] px-3.5 py-3 text-xs font-extrabold hover:bg-[#F2B705] transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Pin</span>
        </button>
      </div>

      {isOpen && candidates.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[52px] z-[600] rounded-xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] shadow-2xl overflow-hidden divide-y divide-neutral-100 dark:divide-white/10 max-h-72 overflow-y-auto"
        >
          {candidates.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handlePickCandidate(item)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                {item.source === 'coords' ? (
                  <MapPin className="w-4 h-4 text-[#FFC107] shrink-0 mt-0.5" />
                ) : (
                  <Globe className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between text-xs">
        {pinnedCoords ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium font-mono-tabular">
            <MapPin className="w-3.5 h-3.5" />
            Destination Pinned: {pinnedCoords.lat.toFixed(5)}, {pinnedCoords.lng.toFixed(5)}
          </span>
        ) : (
          <span className="text-neutral-500 dark:text-neutral-400">
            Search worldwide, tap a suggestion (or Pin), or tap directly on the map.
          </span>
        )}
      </div>

      {searchError && <p className="text-xs text-amber-500">{searchError}</p>}
    </div>
  );
};
