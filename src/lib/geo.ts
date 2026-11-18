import type { LatLngLiteral } from '../types/tracking';

export const STAGES = [
  { label: 'Placed', key: 'placed' },
  { label: 'Assigned', key: 'assigned' },
  { label: 'Picked Up', key: 'picked_up' },
  { label: 'On the Move', key: 'moving' },
  { label: 'Almost There', key: 'near' },
  { label: 'Delivered', key: 'delivered' },
] as const;

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function toValidLatLng(lat: unknown, lng: unknown): LatLngLiteral | null {
  if (lat === null || lat === undefined || lat === '' || lng === null || lng === undefined || lng === '') {
    return null;
  }
  const nLat = typeof lat === 'number' ? lat : Number(lat);
  const nLng = typeof lng === 'number' ? lng : Number(lng);
  if (!isValidLatLng(nLat, nLng)) return null;
  if (nLat === 0 && nLng === 0) return null;
  return { lat: nLat, lng: nLng };
}

export function distanceMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function bearingDegrees(a: LatLngLiteral, b: LatLngLiteral): number {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x =
    Math.cos(a.lat * rad) * Math.sin(b.lat * rad) -
    Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function computeProgressPct(
  rider: LatLngLiteral | null,
  start: LatLngLiteral | null,
  dest: LatLngLiteral | null
): number | null {
  if (!rider || !start || !dest) return null;
  const total = distanceMeters(start, dest);
  const rem = distanceMeters(rider, dest);
  if (total < 40) return rem < 40 ? 100 : 90;
  return Math.max(2, Math.min(99, Math.round((1 - rem / total) * 100)));
}

export function computeStage(
  status: string | undefined,
  hasRider: boolean,
  hasFix: boolean,
  pct: number | null
): number {
  if (status === 'delivered') return 5;
  if (status === 'cancelled') return 0;
  if (!hasRider) return 0;
  if (!hasFix) return 1;
  if (pct == null) return 2;
  if (pct >= 92) return 4;
  if (pct >= 8) return 3;
  return 2;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '—';
  if (meters < 25) return 'Arrived';
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function formatEta(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const mins = Math.round(seconds / 60);
  if (mins <= 0) return '< 1 min';
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins} min`;
}

export function toMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') {
    const parsed = Date.parse(v);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof v === 'object') {
    const obj = v as { toMillis?: () => number; seconds?: number };
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
  }
  return 0;
}

export function formatAgo(ms: number): string {
  if (!ms) return '—';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function formatNaira(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return '₦' + Number(v).toLocaleString('en-NG');
}

export function sanitizeOrderId(raw: string): string {
  let clean = raw.trim();
  if (/^https?:\/\//i.test(clean)) {
    try {
      const u = new URL(clean);
      clean = u.searchParams.get('id') || u.pathname.split('/').pop() || '';
    } catch {
      // ignore invalid URL
    }
  }
  return clean.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40);
}

/**
 * Parses direct global coordinates like "6.5244, 3.3792" or Google Maps URLs containing @lat,lng, q=lat,lng, or !3dlat!4dlng.
 */
export function parseCoordinateInput(raw: string): LatLngLiteral | null {
  const trimmed = raw.trim();
  const direct = trimmed.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (direct) {
    const lat = Number(direct[1]);
    const lng = Number(direct[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }
  const atMatch = trimmed.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }
  const qMatch = trimmed.match(/[?&](?:q|ll|destination)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (qMatch) {
    const lat = Number(qMatch[1]);
    const lng = Number(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }
  const pbMatch = trimmed.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (pbMatch) {
    const lat = Number(pbMatch[1]);
    const lng = Number(pbMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }
  return null;
}

export interface GlobalPlaceMatch {
  id: string;
  title: string;
  subtitle: string;
  source: 'coords' | 'photon' | 'nominatim';
  coords: LatLngLiteral;
}

export async function searchGlobalPlaces(
  rawQuery: string,
  signal?: AbortSignal
): Promise<GlobalPlaceMatch[]> {
  const trimmed = rawQuery.trim();
  if (trimmed.length < 2) return [];

  const direct = parseCoordinateInput(trimmed);
  if (direct) {
    return [
      {
        id: `coords-${direct.lat}-${direct.lng}`,
        title: `Pinned Coordinates (${direct.lat.toFixed(5)}, ${direct.lng.toFixed(5)})`,
        subtitle: 'Direct global latitude / longitude or map link',
        source: 'coords',
        coords: direct,
      },
    ];
  }

  if (!navigator.onLine) return [];

  const [photonRes, nomRes] = await Promise.allSettled([
    fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6&lang=en`,
      { signal }
    ).then((r) => (r.ok ? r.json() : null)),
    fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(trimmed)}&limit=6&addressdetails=1`,
      {
        signal,
        headers: { Accept: 'application/json' },
      }
    ).then((r) => (r.ok ? r.json() : null)),
  ]);

  const merged: GlobalPlaceMatch[] = [];
  const seen = new Set<string>();

  const addCandidate = (c: GlobalPlaceMatch) => {
    if (!isValidLatLng(c.coords.lat, c.coords.lng)) return;
    const key = `${c.coords.lat.toFixed(3)}:${c.coords.lng.toFixed(3)}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(c);
  };

  if (photonRes.status === 'fulfilled' && photonRes.value?.features) {
    const features = photonRes.value.features as Array<{
      geometry: { coordinates: [number, number] };
      properties?: {
        name?: string;
        street?: string;
        housenumber?: string;
        district?: string;
        city?: string;
        state?: string;
        country?: string;
      };
    }>;
    features.forEach((f, idx) => {
      const p = f.properties || {};
      const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ');
      const title = p.name || streetLine || p.city || p.country || 'Location';
      const subtitle = [
        streetLine !== title ? streetLine : '',
        p.district,
        p.city,
        p.state,
        p.country,
      ]
        .filter(Boolean)
        .join(', ');
      addCandidate({
        id: `ph-${idx}-${f.geometry.coordinates[0]}`,
        title,
        subtitle:
          subtitle ||
          `${f.geometry.coordinates[1].toFixed(4)}, ${f.geometry.coordinates[0].toFixed(4)}`,
        source: 'photon',
        coords: {
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        },
      });
    });
  }

  if (nomRes.status === 'fulfilled' && Array.isArray(nomRes.value)) {
    const items = nomRes.value as Array<{
      place_id: number;
      lat: string;
      lon: string;
      display_name: string;
      name?: string;
    }>;
    items.forEach((item) => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      const parts = item.display_name.split(',').map((s) => s.trim());
      const title = item.name || parts[0] || 'Global Location';
      const subtitle = parts.slice(1).join(', ');
      addCandidate({
        id: `nom-${item.place_id}`,
        title,
        subtitle: subtitle || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        source: 'nominatim',
        coords: { lat, lng },
      });
    });
  }

  return merged.slice(0, 8);
}

