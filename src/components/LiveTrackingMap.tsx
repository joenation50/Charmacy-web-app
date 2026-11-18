import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Compass, LocateFixed, Maximize2, Navigation } from 'lucide-react';
import { OSM_ATTRIBUTION, OSM_FALLBACK_TILE_URL, OSM_TILE_URL } from '../lib/mapsConfig';
import { distanceMeters, isValidLatLng } from '../lib/geo';
import type { LatLngLiteral } from '../types/tracking';

export interface FleetMarkerItem {
  id: string;
  lat: number;
  lng: number;
  destLat?: number;
  destLng?: number;
  destLabel?: string;
  heading?: number | null;
  isMoving?: boolean;
  label: string;
  sublabel?: string;
  onSelect?: () => void;
}

interface LiveTrackingMapProps {
  theme: 'dark' | 'light';
  riderPos?: (LatLngLiteral & {
    heading?: number | null;
    isMoving?: boolean;
    speedKmh?: number;
    label?: string;
  }) | null;
  destPos?: (LatLngLiteral & { address?: string }) | null;
  startPos?: LatLngLiteral | null;
  trail?: LatLngLiteral[];
  fleetMarkers?: FleetMarkerItem[];
  allowMapClickDestination?: boolean;
  onMapClickDestination?: (coords: LatLngLiteral) => void;
  onRouteCalculated?: (info: { distanceMeters: number; durationSeconds: number }) => void;
  heightClass?: string;
}

function isMapAlive(map: L.Map | null): map is L.Map {
  if (!map) return false;
  try {
    const pane = map.getPane?.('mapPane');
    const container = map.getContainer?.();
    return Boolean(pane && container && container.isConnected);
  } catch {
    return false;
  }
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  theme,
  riderPos = null,
  destPos = null,
  startPos = null,
  trail = [],
  fleetMarkers,
  allowMapClickDestination = false,
  onMapClickDestination,
  onRouteCalculated,
  heightClass = 'h-[360px] md:h-[440px]',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMkRef = useRef<L.Marker | null>(null);
  const destMkRef = useRef<L.Marker | null>(null);
  const startMkRef = useRef<L.Marker | null>(null);
  const fleetLayerRef = useRef<L.LayerGroup | null>(null);
  const routeGlowRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeFlowRef = useRef<L.Polyline | null>(null);
  const trailLineRef = useRef<L.Polyline | null>(null);

  const [follow, setFollow] = useState(false);
  const followRef = useRef(false);
  followRef.current = follow;

  const [fitTrigger, setFitTrigger] = useState(0);
  const [routeState, setRouteState] = useState<'none' | 'direct' | 'road'>('none');
  const [tilesReady, setTilesReady] = useState(false);
  const didInitialViewRef = useRef(false);
  const lastDestKeyRef = useRef('');
  const lastOsrmAtRef = useRef(0);
  const lastOsrmCoordsRef = useRef('');
  const lastRoadDestRef = useRef('');
  const renderedRiderRef = useRef<LatLngLiteral | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const baseRoadTailRef = useRef<[number, number][]>([]);

  const onClickDestRef = useRef(onMapClickDestination);
  onClickDestRef.current = onMapClickDestination;
  const allowClickRef = useRef(allowMapClickDestination);
  allowClickRef.current = allowMapClickDestination;
  const onRouteCalcRef = useRef(onRouteCalculated);
  onRouteCalcRef.current = onRouteCalculated;

  // Initialize single free OpenStreetMap Leaflet map (no API key, no WebGL failure)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;

    const hasLivePoints =
      Boolean(riderPos && isValidLatLng(riderPos.lat, riderPos.lng)) ||
      Boolean(destPos && isValidLatLng(destPos.lat, destPos.lng)) ||
      Boolean(fleetMarkers && fleetMarkers.length > 0);

    const initialCenter: [number, number] =
      riderPos && isValidLatLng(riderPos.lat, riderPos.lng)
        ? [riderPos.lat, riderPos.lng]
        : destPos && isValidLatLng(destPos.lat, destPos.lng)
        ? [destPos.lat, destPos.lng]
        : fleetMarkers?.[0] && isValidLatLng(fleetMarkers[0].lat, fleetMarkers[0].lng)
        ? [fleetMarkers[0].lat, fleetMarkers[0].lng]
        : [5.4836, 7.0332]; // Fallback view only before any GPS or search arrives

    const map = L.map(el, {
      center: initialCenter,
      zoom: hasLivePoints ? (fleetMarkers?.length ? 12 : 14) : 3,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    const primaryTiles = L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION,
    }).addTo(map);

    let tileErrorCount = 0;
    let fallbackAdded = false;

    primaryTiles.on('load', () => {
      if (!disposed) setTilesReady(true);
    });
    primaryTiles.on('tileload', () => {
      if (!disposed) setTilesReady(true);
    });
    primaryTiles.on('tileerror', () => {
      tileErrorCount += 1;
      if (!disposed && !fallbackAdded && tileErrorCount >= 4 && isMapAlive(map)) {
        fallbackAdded = true;
        const fallbackTiles = L.tileLayer(OSM_FALLBACK_TILE_URL, {
          subdomains: ['a', 'b', 'c'],
          maxZoom: 19,
          attribution: OSM_ATTRIBUTION,
        }).addTo(map);
        fallbackTiles.on('tileload', () => {
          if (!disposed) setTilesReady(true);
        });
      }
    });

    fleetLayerRef.current = L.layerGroup().addTo(map);

    map.on('dragstart', () => setFollow(false));
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (allowClickRef.current && onClickDestRef.current) {
        onClickDestRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    // If no shipment coordinates yet, gently center on device GPS when available
    if (!hasLivePoints && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (disposed || mapRef.current !== map || !isMapAlive(map)) return;
          const { latitude, longitude } = pos.coords;
          if (isValidLatLng(latitude, longitude) && !didInitialViewRef.current) {
            map.setView([latitude, longitude], 14, { animate: false });
          }
        },
        () => {},
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
    }

    mapRef.current = map;

    const safeInvalidate = () => {
      if (!disposed && mapRef.current === map && isMapAlive(map)) {
        map.invalidateSize({ pan: false });
      }
    };

    const ro = new ResizeObserver(safeInvalidate);
    ro.observe(el);
    window.addEventListener('resize', safeInvalidate);
    window.addEventListener('orientationchange', safeInvalidate);
    const t1 = window.setTimeout(safeInvalidate, 100);
    const t2 = window.setTimeout(safeInvalidate, 400);
    const t3 = window.setTimeout(() => {
      if (!disposed) setTilesReady(true);
    }, 3500);

    return () => {
      disposed = true;
      if (animFrameRef.current != null) {
        window.cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener('resize', safeInvalidate);
      window.removeEventListener('orientationchange', safeInvalidate);
      ro.disconnect();
      mapRef.current = null;
      riderMkRef.current = null;
      destMkRef.current = null;
      startMkRef.current = null;
      fleetLayerRef.current = null;
      routeGlowRef.current = null;
      routeLineRef.current = null;
      routeFlowRef.current = null;
      trailLineRef.current = null;
      renderedRiderRef.current = null;
      baseRoadTailRef.current = [];
      map.off();
      map.remove();
    };
  }, []);

  // Rider Marker + Smooth Animated Polyline Origin Interpolation (60fps glide as Firestore coordinates stream)
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapAlive(map)) return;

    if (!riderPos || !isValidLatLng(riderPos.lat, riderPos.lng)) {
      if (animFrameRef.current != null) {
        window.cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      riderMkRef.current?.remove();
      riderMkRef.current = null;
      renderedRiderRef.current = null;
      return;
    }

    const moving = riderPos.isMoving !== false;
    const rot = typeof riderPos.heading === 'number' ? Math.round(riderPos.heading) : 0;
    const iconHtml = `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        ${
          moving
            ? '<span class="rider-pulse-ring" style="position:absolute;inset:0;border-radius:9999px;border:2px solid #FFC107;"></span>'
            : ''
        }
        <span style="width:34px;height:34px;border-radius:9999px;background:${
          moving ? '#FFC107' : '#1f2937'
        };color:${moving ? '#0A0A0A' : '#FFC107'};border:2.5px solid ${
      moving ? '#0A0A0A' : '#FFC107'
    };box-shadow:0 4px 12px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;transform:rotate(${rot}deg);">
          ▲
        </span>
      </div>
    `;

    const icon = L.divIcon({
      className: 'cm-div-icon',
      html: iconHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const syncVisualPosition = (lat: number, lng: number) => {
      renderedRiderRef.current = { lat, lng };
      riderMkRef.current?.setLatLng([lat, lng]);

      // Smoothly update the starting point of the active Leaflet Polylines to stay anchored to the moving rider
      if (baseRoadTailRef.current.length > 0 && isMapAlive(mapRef.current)) {
        const syncedPts: [number, number][] = [[lat, lng], ...baseRoadTailRef.current];
        routeGlowRef.current?.setLatLngs(syncedPts);
        routeLineRef.current?.setLatLngs(syncedPts);
        routeFlowRef.current?.setLatLngs(syncedPts);
      }

      if (followRef.current && isMapAlive(mapRef.current)) {
        mapRef.current.panTo([lat, lng], { animate: false });
      }
    };

    if (!riderMkRef.current) {
      riderMkRef.current = L.marker([riderPos.lat, riderPos.lng], {
        icon,
        zIndexOffset: 600,
      }).addTo(map);
      if (riderPos.label) {
        riderMkRef.current.bindTooltip(riderPos.label, { direction: 'top', offset: [0, -18] });
      }
      syncVisualPosition(riderPos.lat, riderPos.lng);
      return;
    }

    riderMkRef.current.setIcon(icon);

    const from = renderedRiderRef.current || { lat: riderPos.lat, lng: riderPos.lng };
    const to = { lat: riderPos.lat, lng: riderPos.lng };
    const jumpMeters = distanceMeters(from, to);

    if (animFrameRef.current != null) {
      window.cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (jumpMeters < 0.5 || jumpMeters > 50000) {
      syncVisualPosition(to.lat, to.lng);
      return;
    }

    const durationMs = 700;
    const startTime = performance.now();

    const step = (now: number) => {
      if (!isMapAlive(mapRef.current)) {
        animFrameRef.current = null;
        return;
      }
      const rawT = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - rawT, 3);
      const curLat = from.lat + (to.lat - from.lat) * eased;
      const curLng = from.lng + (to.lng - from.lng) * eased;
      syncVisualPosition(curLat, curLng);

      if (rawT < 1) {
        animFrameRef.current = window.requestAnimationFrame(step);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current != null) {
        window.cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [riderPos?.lat, riderPos?.lng, riderPos?.heading, riderPos?.isMoving, riderPos?.label]);

  // Destination Drop-off Marker (pinned accurately on BOTH Rider and Track maps)
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapAlive(map)) return;

    if (!destPos || !isValidLatLng(destPos.lat, destPos.lng)) {
      destMkRef.current?.remove();
      destMkRef.current = null;
      return;
    }

    const icon = L.divIcon({
      className: 'cm-div-icon',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);margin-left:16px;margin-top:34px;">
          <div style="padding:4px 10px;border-radius:9999px;background:#059669;color:#ffffff;font-size:11px;font-weight:800;border:2px solid #ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.4);white-space:nowrap;">
            ⚑ Drop-off
          </div>
          <div style="width:10px;height:10px;background:#059669;transform:rotate(45deg);margin-top:-6px;border-right:2px solid #ffffff;border-bottom:2px solid #ffffff;"></div>
        </div>
      `,
      iconSize: [32, 34],
      iconAnchor: [16, 34],
    });

    if (!destMkRef.current) {
      destMkRef.current = L.marker([destPos.lat, destPos.lng], {
        icon,
        zIndexOffset: 500,
      }).addTo(map);
    } else {
      destMkRef.current.setLatLng([destPos.lat, destPos.lng]);
      destMkRef.current.setIcon(icon);
    }

    if (destPos.address) {
      destMkRef.current.bindPopup(`<strong>Delivery Drop-off</strong><br/>${destPos.address}`);
    }
  }, [destPos?.lat, destPos?.lng, destPos?.address]);

  // Origin Marker (only shown if distinct from riderPos & destPos)
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapAlive(map)) return;

    if (!startPos || !isValidLatLng(startPos.lat, startPos.lng)) {
      startMkRef.current?.remove();
      startMkRef.current = null;
      return;
    }

    if (!startMkRef.current) {
      const icon = L.divIcon({
        className: 'cm-div-icon',
        html: '<div style="width:14px;height:14px;border-radius:9999px;background:#3B82F6;border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      startMkRef.current = L.marker([startPos.lat, startPos.lng], { icon })
        .bindTooltip('Dispatch Origin')
        .addTo(map);
    } else {
      startMkRef.current.setLatLng([startPos.lat, startPos.lng]);
    }
  }, [startPos?.lat, startPos?.lng]);

  // Rider Trail Breadcrumb Line
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapAlive(map)) return;

    const pts: [number, number][] = trail
      .filter((p) => isValidLatLng(p.lat, p.lng))
      .map((p) => [p.lat, p.lng]);

    if (pts.length < 2) {
      trailLineRef.current?.remove();
      trailLineRef.current = null;
      return;
    }

    if (!trailLineRef.current) {
      trailLineRef.current = L.polyline(pts, {
        color: '#3B82F6',
        weight: 3.5,
        opacity: 0.72,
        dashArray: '6 6',
      }).addTo(map);
    } else {
      trailLineRef.current.setLatLngs(pts);
    }
  }, [trail]);

  // Route from Rider's Current Location -> Delivery Destination (OSRM road route + instant fallback line)
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapAlive(map)) return;

    const hasRider = Boolean(riderPos && isValidLatLng(riderPos.lat, riderPos.lng));
    const hasDest = Boolean(destPos && isValidLatLng(destPos.lat, destPos.lng));

    if (!hasRider || !hasDest || !riderPos || !destPos) {
      baseRoadTailRef.current = [];
      routeGlowRef.current?.remove();
      routeLineRef.current?.remove();
      routeFlowRef.current?.remove();
      routeGlowRef.current = null;
      routeLineRef.current = null;
      routeFlowRef.current = null;
      setRouteState('none');
      return;
    }

    const straight = distanceMeters(riderPos, destPos);

    const setRouteCoords = (latlngs: [number, number][], dashed: boolean) => {
      if (!isMapAlive(mapRef.current)) return;
      baseRoadTailRef.current = latlngs.slice(1);
      const startOrigin = renderedRiderRef.current || { lat: riderPos.lat, lng: riderPos.lng };
      const activePts: [number, number][] = [
        [startOrigin.lat, startOrigin.lng],
        ...baseRoadTailRef.current,
      ];

      if (!routeGlowRef.current) {
        routeGlowRef.current = L.polyline(activePts, {
          color: '#FFC107',
          weight: 11,
          opacity: 0.22,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      } else {
        routeGlowRef.current.setLatLngs(activePts);
      }

      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline(activePts, {
          color: '#FFC107',
          weight: 4.5,
          opacity: dashed ? 0.65 : 0.92,
          dashArray: dashed ? '8 8' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      } else {
        routeLineRef.current.setLatLngs(activePts);
        routeLineRef.current.setStyle({
          opacity: dashed ? 0.65 : 0.92,
          dashArray: dashed ? '8 8' : undefined,
        });
      }

      if (!routeFlowRef.current) {
        routeFlowRef.current = L.polyline(activePts, {
          color: '#FFFFFF',
          weight: 2.5,
          opacity: 0.85,
          dashArray: '10 14',
          className: 'cm-route-flow',
          lineCap: 'round',
        }).addTo(map);
      } else {
        routeFlowRef.current.setLatLngs(activePts);
      }
    };

    if (straight < 20) {
      lastRoadDestRef.current = '';
      baseRoadTailRef.current = [];
      routeGlowRef.current?.remove();
      routeLineRef.current?.remove();
      routeFlowRef.current?.remove();
      routeGlowRef.current = null;
      routeLineRef.current = null;
      routeFlowRef.current = null;
      setRouteState('none');
      onRouteCalcRef.current?.({ distanceMeters: 0, durationSeconds: 0 });
      return;
    }

    const destKey = `${destPos.lat.toFixed(5)},${destPos.lng.toFixed(5)}`;
    const coordKey = `${riderPos.lat.toFixed(4)},${riderPos.lng.toFixed(4)}->${destKey}`;
    const hasRoadForDest = lastRoadDestRef.current === destKey && Boolean(routeLineRef.current);

    if (!hasRoadForDest) {
      // Draw instant animated dashed Polyline from Rider -> Firestore Destination before OSRM responds
      setRouteCoords(
        [
          [riderPos.lat, riderPos.lng],
          [destPos.lat, destPos.lng],
        ],
        true
      );
      setRouteState('direct');
    }

    if (!navigator.onLine) {
      onRouteCalcRef.current?.({
        distanceMeters: Math.round(straight),
        durationSeconds: Math.max(60, Math.round((straight / 1000 / 26) * 3600)),
      });
      return;
    }

    if (lastOsrmCoordsRef.current === coordKey && Date.now() - lastOsrmAtRef.current < 8000) {
      return;
    }

    lastOsrmAtRef.current = Date.now();
    lastOsrmCoordsRef.current = coordKey;
    const ac = new AbortController();

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${riderPos.lng},${riderPos.lat};${destPos.lng},${destPos.lat}?overview=full&geometries=geojson`,
      { signal: ac.signal }
    )
      .then((r) => r.json())
      .then(
        (data: {
          routes?: Array<{
            geometry?: { coordinates?: Array<[number, number]> };
            distance: number;
            duration: number;
          }>;
        }) => {
          const route = data.routes?.[0];
          const coords = route?.geometry?.coordinates;
          if (!route || !coords || coords.length < 2) {
            onRouteCalcRef.current?.({
              distanceMeters: Math.round(straight),
              durationSeconds: Math.max(60, Math.round((straight / 1000 / 26) * 3600)),
            });
            return;
          }
          const roadLatLngs: [number, number][] = [
            [riderPos.lat, riderPos.lng],
            ...coords.map(([lng, lat]): [number, number] => [lat, lng]),
            [destPos.lat, destPos.lng],
          ];
          lastRoadDestRef.current = destKey;
          setRouteCoords(roadLatLngs, false);
          setRouteState('road');
          onRouteCalcRef.current?.({
            distanceMeters: route.distance,
            durationSeconds: Math.max(60, Math.round(route.duration)),
          });
        }
      )
      .catch(() => {
        onRouteCalcRef.current?.({
          distanceMeters: Math.round(straight),
          durationSeconds: Math.max(60, Math.round((straight / 1000 / 26) * 3600)),
        });
      });

    return () => ac.abort();
  }, [riderPos?.lat, riderPos?.lng, destPos?.lat, destPos?.lng]);

  // Fleet Markers for Admin Console
  useEffect(() => {
    const map = mapRef.current;
    const group = fleetLayerRef.current;
    if (!isMapAlive(map) || !group) return;

    group.clearLayers();
    if (!fleetMarkers?.length) return;

    const bounds = L.latLngBounds([]);
    fleetMarkers.forEach((fm) => {
      if (!isValidLatLng(fm.lat, fm.lng)) return;
      bounds.extend([fm.lat, fm.lng]);

      const icon = L.divIcon({
        className: 'cm-div-icon',
        html: `<button type="button" style="padding:3px 9px;border-radius:9999px;background:#FFC107;color:#0A0A0A;font-size:11px;font-weight:800;border:2px solid #0A0A0A;box-shadow:0 2px 8px rgba(0,0,0,0.35);white-space:nowrap;cursor:pointer;">${fm.label}</button>`,
        iconSize: [90, 26],
        iconAnchor: [45, 13],
      });

      const mk = L.marker([fm.lat, fm.lng], { icon }).addTo(group);
      mk.on('click', () => fm.onSelect?.());

      if (fm.destLat != null && fm.destLng != null && isValidLatLng(fm.destLat, fm.destLng)) {
        bounds.extend([fm.destLat, fm.destLng]);
        const dIcon = L.divIcon({
          className: 'cm-div-icon',
          html: '<div style="width:12px;height:12px;border-radius:9999px;background:#10b981;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([fm.destLat, fm.destLng], { icon: dIcon }).addTo(group);
        L.polyline(
          [
            [fm.lat, fm.lng],
            [fm.destLat, fm.destLng],
          ],
          { color: '#FFC107', weight: 2.5, opacity: 0.7, dashArray: '5 5' }
        ).addTo(group);
      }
    });

    if (!didInitialViewRef.current && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 14 });
      didInitialViewRef.current = true;
    }
  }, [fleetMarkers]);

  // Fit Bounds when Rider + Destination first appear, when Destination changes, or on Fit click
  useEffect(() => {
    const map = mapRef.current;
    if (!isMapAlive(map)) return;

    const destKey = destPos ? `${destPos.lat.toFixed(5)},${destPos.lng.toFixed(5)}` : '';
    const destChanged = destKey !== '' && destKey !== lastDestKeyRef.current;
    if (destChanged) {
      lastDestKeyRef.current = destKey;
    }

    if (!destChanged && fitTrigger === 0 && didInitialViewRef.current) return;

    if (riderPos && destPos && isValidLatLng(riderPos.lat, riderPos.lng) && isValidLatLng(destPos.lat, destPos.lng)) {
      const bounds = L.latLngBounds([
        [riderPos.lat, riderPos.lng],
        [destPos.lat, destPos.lng],
      ]);
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15, animate: false });
      didInitialViewRef.current = true;
    } else if (destPos && isValidLatLng(destPos.lat, destPos.lng)) {
      map.setView([destPos.lat, destPos.lng], 15, { animate: false });
      didInitialViewRef.current = true;
    } else if (riderPos && isValidLatLng(riderPos.lat, riderPos.lng)) {
      map.setView([riderPos.lat, riderPos.lng], 15, { animate: false });
      didInitialViewRef.current = true;
    }
  }, [fitTrigger, riderPos?.lat, riderPos?.lng, destPos?.lat, destPos?.lng]);

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] shadow-sm ${
        theme === 'dark' ? 'cm-leaflet-dark' : ''
      }`}
    >
      {/* Dedicated Top Map Status Bar — sits ABOVE map canvas with zero clutter or paid style options */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#161922]">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          {riderPos ? (
            <>
              <Navigation
                className={`w-3.5 h-3.5 ${
                  riderPos.isMoving ? 'text-emerald-500' : 'text-[#FFC107]'
                }`}
              />
              <span>{riderPos.isMoving ? 'Rider Moving' : 'Rider Stopped'}</span>
              {typeof riderPos.speedKmh === 'number' && (
                <span className="text-neutral-500 dark:text-neutral-400 font-mono-tabular">
                  · {riderPos.speedKmh} km/h
                </span>
              )}
            </>
          ) : (
            <>
              <Compass className="w-3.5 h-3.5 text-[#FFC107]" />
              <span>
                {allowMapClickDestination
                  ? 'Tap map to pin delivery drop-off'
                  : 'Free Live Route Map'}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold">
          {routeState === 'road' && (
            <span className="rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5">
              Route Active
            </span>
          )}
          {routeState === 'direct' && (
            <span className="rounded-md bg-[#FFC107]/15 text-[#b48600] dark:text-[#FFC107] px-2 py-0.5">
              Direct Route
            </span>
          )}
          <span className="text-neutral-500 dark:text-neutral-400">OpenStreetMap · Offline Ready</span>
        </div>
      </div>

      {/* Unobstructed Map Viewport */}
      <div className={`relative w-full min-h-[300px] ${heightClass}`}>
        <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

        {!tilesReady && (
          <div className="pointer-events-none absolute inset-0 z-[350] flex items-center justify-center bg-neutral-100/70 dark:bg-[#0e1015]/70 backdrop-blur-[1px]">
            <div className="rounded-xl border border-neutral-300 dark:border-white/15 bg-white/95 dark:bg-[#12141a]/95 px-4 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 shadow-lg">
              Loading OpenStreetMap tiles...
            </div>
          </div>
        )}

        {/* Bottom-Right Map Action Buttons */}
        <div className="absolute bottom-4 right-3 z-[400] flex flex-col gap-2">
          {(riderPos || destPos) && (
            <button
              type="button"
              onClick={() => {
                setFollow(false);
                setFitTrigger((n) => n + 1);
              }}
              title="Fit rider, route & destination"
              className="w-10 h-10 rounded-full border border-neutral-300 dark:border-white/15 bg-white/95 dark:bg-[#0A0A0A]/95 text-neutral-900 dark:text-white flex items-center justify-center shadow-lg hover:border-[#FFC107] transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          {riderPos && (
            <button
              type="button"
              onClick={() => {
                const next = !follow;
                setFollow(next);
                if (next && mapRef.current) {
                  mapRef.current.setView([riderPos.lat, riderPos.lng], 15, { animate: true });
                }
              }}
              title={follow ? 'Following rider' : 'Follow rider'}
              className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-lg transition-colors cursor-pointer ${
                follow
                  ? 'bg-[#FFC107] border-[#FFC107] text-[#0A0A0A]'
                  : 'bg-white/95 dark:bg-[#0A0A0A]/95 border-neutral-300 dark:border-white/15 text-neutral-900 dark:text-white hover:border-[#FFC107]'
              }`}
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
