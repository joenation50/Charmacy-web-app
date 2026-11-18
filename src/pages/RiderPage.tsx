import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Compass,
  Copy,
  Flag,
  Gauge,
  KeyRound,
  LogOut,
  MessageCircle,
  Navigation,
  PackagePlus,
  Radio,
  RefreshCw,
  Save,
  ShieldCheck,
  Signal,
  UserCheck,
  WifiOff,
} from 'lucide-react';
import { AuthGateCard } from '../components/AuthGateCard';
import { DestinationSearch } from '../components/DestinationSearch';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { useToast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { ThemeMode } from '../hooks/useTheme';
import { db, handleFirestoreError, OperationType, orderRef } from '../lib/firebase';
import {
  bearingDegrees,
  computeProgressPct,
  distanceMeters,
  formatAgo,
  formatDistance,
  formatEta,
  formatNaira,
  isValidLatLng,
  searchGlobalPlaces,
  toMillis,
  toValidLatLng,
} from '../lib/geo';
import type {
  DeliveryOrder,
  DestinationSelection,
  LatLngLiteral,
  PaymentMethod,
  PaymentStatus,
} from '../types/tracking';

interface RiderPageProps {
  theme: ThemeMode;
}

interface QueuedTelemetry {
  orderId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  isMoving: boolean;
  trackingState: 'live' | 'stopped';
  locationAt: number;
  sequence: number;
}

const QUEUE_STORAGE_KEY = 'cmQueueV4';

function generateOrderId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `CH-${num}`;
}

export const RiderPage: React.FC<RiderPageProps> = ({ theme }) => {
  const {
    isRiderAuthed,
    riderProfile,
    loginRider,
    logoutRider,
    updateRiderProfile,
  } = useAuth();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();

  // Rider details
  const [riderName, setRiderName] = useState(riderProfile.displayName || '');
  const [riderPhone, setRiderPhone] = useState(riderProfile.phone || '');
  const [riderBike, setRiderBike] = useState(riderProfile.bikePlate || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Orders from charmacy-tracking Firestore
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  // New shipment form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customOrderId, setCustomOrderId] = useState(generateOrderId);
  const [pickupAddress, setPickupAddress] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [packageType, setPackageType] = useState('Parcel');
  const [packageWeight, setPackageWeight] = useState('');
  const [packageValue, setPackageValue] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [priority, setPriority] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [feeInput, setFeeInput] = useState('1500');
  const [packageNote, setPackageNote] = useState('');
  const [destSearchText, setDestSearchText] = useState('');
  const [selectedDest, setSelectedDest] = useState<DestinationSelection | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Live Destination editor while active (auto-syncs immediately to Firestore on selection or map tap)
  const [editingDestText, setEditingDestText] = useState('');
  const [pendingDestPreview, setPendingDestPreview] = useState<DestinationSelection | null>(null);
  const [updatingDest, setUpdatingDest] = useState(false);

  // Automatic GPS & Telemetry
  const [currentGps, setCurrentGps] = useState<{
    lat: number;
    lng: number;
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
    isMoving: boolean;
    updatedAt: number;
  } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [trail, setTrail] = useState<LatLngLiteral[]>([]);
  const [routeStats, setRouteStats] = useState<{
    distanceMeters: number;
    durationSeconds: number;
  } | null>(null);
  const [queuedPoints, setQueuedPoints] = useState<QueuedTelemetry[]>(() => {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as QueuedTelemetry[]) : [];
    } catch {
      return [];
    }
  });

  // Delivery completion
  const [pinInput, setPinInput] = useState('');
  const [completing, setCompleting] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const lastSyncAtRef = useRef<number>(0);
  const lastMotionAnchorRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const lastIsMovingRef = useRef<boolean | null>(null);
  const sequenceRef = useRef<number>(0);
  const currentGpsRef = useRef(currentGps);
  currentGpsRef.current = currentGps;
  const routeStatsRef = useRef(routeStats);
  routeStatsRef.current = routeStats;

  // Listen to orders in charmacy-tracking Firestore when logged in as rider
  useEffect(() => {
    if (!isRiderAuthed) {
      setOrders([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const raw = d.data() as Partial<DeliveryOrder>;
            return {
              ...(raw as DeliveryOrder),
              orderId: raw.orderId || d.id,
            };
          })
          .sort(
            (a, b) =>
              toMillis(b.lastUpdated || b.createdAt) -
              toMillis(a.lastUpdated || a.createdAt)
          );

        setOrders(list);
        setSelectedOrderId((prev) => {
          if (prev && list.some((o) => o.orderId === prev)) return prev;
          const activeOne = list.find((o) => o.status === 'active') || list[0];
          return activeOne ? activeOne.orderId : '';
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'orders');
      }
    );

    return () => unsub();
  }, [isRiderAuthed]);

  const activeOrder = useMemo(
    () => orders.find((o) => o.orderId === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const activeOrderRef = useRef<DeliveryOrder | null>(null);
  activeOrderRef.current = activeOrder;

  // Only reset destination search box when switching WHICH order is selected (never on GPS sequence ticks!)
  useEffect(() => {
    if (activeOrder) {
      sequenceRef.current = Math.max(sequenceRef.current, Number(activeOrder.sequence) || 0);
      setEditingDestText(activeOrder.destAddress || '');
      setPendingDestPreview(null);
    } else {
      setEditingDestText('');
      setPendingDestPreview(null);
    }
  }, [activeOrder?.orderId]);

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queuedPoints.slice(-30)));
    } catch {
      // ignore storage errors
    }
  }, [queuedPoints]);

  // Flush offline telemetry points when back online
  const flushOfflineQueue = useCallback(async () => {
    const order = activeOrderRef.current;
    if (!isRiderAuthed || !navigator.onLine || queuedPoints.length === 0) return;
    const latest = queuedPoints[queuedPoints.length - 1];
    if (!order || order.orderId !== latest.orderId || order.status !== 'active') {
      setQueuedPoints([]);
      return;
    }

    try {
      const nextSeq = Math.max(sequenceRef.current + 1, latest.sequence);
      sequenceRef.current = nextSeq;
      await updateDoc(orderRef(order.orderId), {
        lat: latest.lat,
        lng: latest.lng,
        heading: latest.heading,
        speed: latest.speed,
        accuracy: latest.accuracy,
        isMoving: latest.isMoving,
        trackingState: latest.trackingState,
        locationAt: latest.locationAt,
        sequence: nextSeq,
        heartbeatAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
      setQueuedPoints([]);
      toast('Offline GPS telemetry synced.', 'ok');
    } catch {
      // retry on next cycle
    }
  }, [isRiderAuthed, queuedPoints, toast]);

  useEffect(() => {
    if (isOnline && queuedPoints.length > 0) {
      void flushOfflineQueue();
    }
  }, [isOnline, queuedPoints.length, flushOfflineQueue]);

  const pushTelemetryToFirestore = useCallback(
    async (
      order: DeliveryOrder,
      pt: {
        lat: number;
        lng: number;
        heading: number | null;
        speed: number | null;
        accuracy: number | null;
        isMoving: boolean;
        updatedAt: number;
      }
    ) => {
      if (!isRiderAuthed || order.status !== 'active') return;
      const nextSeq = Math.max(sequenceRef.current, Number(order.sequence) || 0) + 1;
      sequenceRef.current = nextSeq;
      const trackingState: 'live' | 'stopped' = pt.isMoving ? 'live' : 'stopped';

      if (!navigator.onLine) {
        setQueuedPoints((prev) => [
          ...prev.slice(-24),
          {
            orderId: order.orderId,
            lat: pt.lat,
            lng: pt.lng,
            heading: pt.heading,
            speed: pt.speed,
            accuracy: pt.accuracy,
            isMoving: pt.isMoving,
            trackingState,
            locationAt: pt.updatedAt,
            sequence: nextSeq,
          },
        ]);
        return;
      }

      const routeInfo = routeStatsRef.current;
      const payload: Record<string, unknown> = {
        lat: pt.lat,
        lng: pt.lng,
        heading: pt.heading,
        speed: pt.speed,
        accuracy: pt.accuracy,
        isMoving: pt.isMoving,
        trackingState,
        locationAt: pt.updatedAt,
        sequence: nextSeq,
        heartbeatAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      };
      if (order.startLat == null || order.startLng == null) {
        payload.startLat = pt.lat;
        payload.startLng = pt.lng;
      }
      if (routeInfo) {
        payload.routeDistanceMeters = Math.max(0, Math.round(routeInfo.distanceMeters));
        payload.routeDurationSeconds = Math.max(0, Math.round(routeInfo.durationSeconds));
      }

      try {
        await setDoc(orderRef(order.orderId), payload, { merge: true });
      } catch {
        setQueuedPoints((prev) => [
          ...prev.slice(-24),
          {
            orderId: order.orderId,
            lat: pt.lat,
            lng: pt.lng,
            heading: pt.heading,
            speed: pt.speed,
            accuracy: pt.accuracy,
            isMoving: pt.isMoving,
            trackingState,
            locationAt: pt.updatedAt,
            sequence: nextSeq,
          },
        ]);
      }
    },
    [isRiderAuthed]
  );

  const processGeolocationPosition = useCallback(
    (pos: GeolocationPosition, forceSync = false) => {
      const { latitude, longitude, accuracy, speed, heading } = pos.coords;
      if (!isValidLatLng(latitude, longitude)) return;
      const prevGps = currentGpsRef.current;
      if (prevGps && !forceSync && typeof accuracy === 'number' && accuracy > 500) return;

      const now = Date.now();
      const rawSpeed =
        typeof speed === 'number' && Number.isFinite(speed) && speed >= 0
          ? Math.min(120, speed)
          : null;

      let computedHeading =
        typeof heading === 'number' && Number.isFinite(heading) && heading >= 0 && heading <= 360
          ? heading
          : prevGps?.heading ?? null;

      let movedMeters = 0;
      let isMoving = false;
      const anchor = lastMotionAnchorRef.current;

      if (anchor) {
        movedMeters = distanceMeters(anchor, { lat: latitude, lng: longitude });
        const dtSec = Math.max(1, (now - anchor.at) / 1000);
        const inferredSpeed = movedMeters / dtSec;

        if (movedMeters >= 4 && computedHeading == null) {
          computedHeading = bearingDegrees(anchor, { lat: latitude, lng: longitude });
        }

        if ((rawSpeed !== null && rawSpeed >= 0.7) || (movedMeters >= 4 && inferredSpeed >= 0.55)) {
          isMoving = true;
          lastMotionAnchorRef.current = { lat: latitude, lng: longitude, at: now };
        } else if (dtSec >= 8 && movedMeters < 3.5) {
          isMoving = false;
          lastMotionAnchorRef.current = { lat: latitude, lng: longitude, at: now };
        } else {
          isMoving = lastIsMovingRef.current ?? false;
        }
      } else {
        lastMotionAnchorRef.current = { lat: latitude, lng: longitude, at: now };
        isMoving = rawSpeed !== null ? rawSpeed >= 0.7 : false;
      }

      const cleanAccuracy =
        typeof accuracy === 'number' && Number.isFinite(accuracy)
          ? Math.min(10000, Math.max(0, accuracy))
          : null;

      const nextGps = {
        lat: latitude,
        lng: longitude,
        heading: computedHeading,
        speed: rawSpeed,
        accuracy: cleanAccuracy,
        isMoving,
        updatedAt: now,
      };
      setCurrentGps(nextGps);
      setPermissionDenied(false);

      setTrail((prev) => {
        const last = prev[prev.length - 1];
        if (last && distanceMeters(last, { lat: latitude, lng: longitude }) < 5) {
          return prev;
        }
        return [...prev.slice(-119), { lat: latitude, lng: longitude }];
      });

      const motionChanged =
        lastIsMovingRef.current !== null && lastIsMovingRef.current !== isMoving;
      lastIsMovingRef.current = isMoving;

      const order = activeOrderRef.current;
      if (
        order &&
        order.status === 'active' &&
        (forceSync || motionChanged || now - lastSyncAtRef.current >= 3000 || movedMeters >= 6)
      ) {
        lastSyncAtRef.current = now;
        void pushTelemetryToFirestore(order, nextGps);
      }
    },
    [pushTelemetryToFirestore]
  );

  // Automatic, Single-Watcher Geolocation (never restarts on Firestore updates -> NO flashing phone GPS notification & NO timeout loops!)
  useEffect(() => {
    if (!isRiderAuthed) {
      if (watchIdRef.current != null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (wakeLockRef.current) {
        void wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setPermissionDenied(true);
      return;
    }

    let cancelled = false;

    const acquireWakeLock = () => {
      if ('wakeLock' in navigator) {
        const wlNav = navigator as unknown as {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        wlNav.wakeLock
          ?.request('screen')
          .then((lock) => {
            if (!cancelled) wakeLockRef.current = lock;
          })
          .catch(() => {});
      }
    };

    const startWatcher = (highAccuracy: boolean) => {
      if (cancelled) return;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => processGeolocationPosition(pos, false),
        (err) => {
          if (cancelled) return;
          if (err.code === 1) {
            setPermissionDenied(true);
            return;
          }
          // On GPS timeout (code 3) or unavailable (code 2) indoors, smoothly fall back to balanced network+GPS mode without throwing timeout banners
          if (highAccuracy) {
            startWatcher(false);
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          maximumAge: highAccuracy ? 5000 : 20000,
          timeout: highAccuracy ? 20000 : 30000,
        }
      );
    };

    acquireWakeLock();
    startWatcher(true);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
        void flushOfflineQueue();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (wakeLockRef.current) {
        void wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isRiderAuthed, processGeolocationPosition, flushOfflineQueue]);

  const handleManualSync = () => {
    if (!('geolocation' in navigator)) {
      toast('Geolocation not supported on this device.', 'err');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        processGeolocationPosition(pos, true);
        toast('Live GPS synced.', 'ok');
      },
      () => {
        // Retry with balanced accuracy if high-accuracy times out
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            processGeolocationPosition(pos, true);
            toast('Live GPS synced.', 'ok');
          },
          (err) => {
            if (err.code === 1) setPermissionDenied(true);
            toast('Waiting for GPS lock. Ensure device Location is turned on.', 'info');
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderName.trim() || riderPhone.trim().length < 4 || riderBike.trim().length < 2) {
      toast('Enter rider name, phone, and bike plate.', 'err');
      return;
    }
    setSavingProfile(true);
    updateRiderProfile({
      displayName: riderName.trim(),
      phone: riderPhone.trim(),
      bikePlate: riderBike.trim().toUpperCase(),
    });
    setSavingProfile(false);
    toast('Rider details updated.', 'ok');
  };

  // Automatically save & pin new destination onto BOTH Rider map and Customer Track map
  const syncDestinationToOrder = useCallback(
    async (order: DeliveryOrder, dest: DestinationSelection) => {
      if (!isValidLatLng(dest.lat, dest.lng)) return;
      setPendingDestPreview(dest);
      setEditingDestText(dest.address);
      setUpdatingDest(true);

      try {
        const origin =
          currentGpsRef.current || toValidLatLng(order.lat, order.lng);

        const dist = origin ? Math.round(distanceMeters(origin, dest)) : 0;
        const dur = origin ? Math.max(60, Math.round((dist / 1000 / 26) * 3600)) : 0;

        await updateDoc(orderRef(order.orderId), {
          destAddress: dest.address,
          destLat: dest.lat,
          destLng: dest.lng,
          ...(origin
            ? {
                routeDistanceMeters: dist,
                routeDurationSeconds: dur,
              }
            : {}),
          lastUpdated: serverTimestamp(),
        });
        toast('Delivery destination pinned on Rider & Customer maps!', 'ok');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${order.orderId}`);
      } finally {
        setUpdatingDest(false);
      }
    },
    [toast]
  );

  const handleMapClickDestination = (coords: LatLngLiteral) => {
    const label = `Pinned Drop-off (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`;
    const sel: DestinationSelection = {
      lat: coords.lat,
      lng: coords.lng,
      address: label,
    };

    if (showCreateForm || !activeOrder || activeOrder.status !== 'active') {
      setSelectedDest(sel);
      setDestSearchText(label);
      toast('Drop-off pinned on map for your new dispatch.', 'ok');
    } else {
      void syncDestinationToOrder(activeOrder, sel);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = customOrderId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!/^[A-Z0-9-]{4,40}$/.test(orderId)) {
      toast('Order ID must be 4–40 letters/numbers/hyphens.', 'err');
      return;
    }

    const cleanRiderName = (riderName || 'CharMary Rider').trim();
    const cleanRiderPhone = (riderPhone || '08087276942').trim();
    const cleanRiderBike = (riderBike || 'CM-01').trim().toUpperCase();

    if (!senderName.trim() || !senderPhone.trim() || !receiverName.trim() || !receiverPhone.trim()) {
      toast('Complete sender and receiver details.', 'err');
      return;
    }

    let resolvedDest = selectedDest;
    if (!resolvedDest && destSearchText.trim().length >= 2) {
      setCreatingOrder(true);
      try {
        const matches = await searchGlobalPlaces(destSearchText.trim());
        if (matches.length > 0) {
          const top = matches[0];
          const label =
            top.source === 'coords'
              ? `${top.coords.lat.toFixed(5)}, ${top.coords.lng.toFixed(5)}`
              : [top.title, top.subtitle].filter(Boolean).join(', ');
          resolvedDest = { lat: top.coords.lat, lng: top.coords.lng, address: label };
          setSelectedDest(resolvedDest);
          setDestSearchText(label);
        }
      } catch {
        // handled below
      }
    }

    if (!resolvedDest || !isValidLatLng(resolvedDest.lat, resolvedDest.lng)) {
      setCreatingOrder(false);
      toast('Search & pin a drop-off destination, or tap directly on the map.', 'err');
      return;
    }

    const riderLat = currentGps?.lat ?? null;
    const riderLng = currentGps?.lng ?? null;
    const deliveryCode = String(Math.floor(1000 + Math.random() * 9000));
    const parsedFee = Math.max(0, Number(feeInput) || 0);
    const parsedValue = packageValue ? Math.max(0, Number(packageValue) || 0) : null;
    const straightDist =
      riderLat != null && riderLng != null
        ? Math.round(distanceMeters({ lat: riderLat, lng: riderLng }, resolvedDest))
        : 0;
    const estDuration =
      straightDist > 0 ? Math.max(60, Math.round((straightDist / 1000 / 26) * 3600)) : 0;

    setCreatingOrder(true);
    try {
      await setDoc(
        orderRef(orderId),
        {
          orderId,
          riderUid: 'rider-portal',
          riderName: cleanRiderName,
          riderPhone: cleanRiderPhone,
          riderBike: cleanRiderBike,
          pickupAddress: pickupAddress.trim(),
          senderName: senderName.trim(),
          senderPhone: senderPhone.trim(),
          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.trim(),
          packageType,
          packageWeight: packageWeight.trim(),
          packageValue: parsedValue,
          isFragile,
          packageNote: packageNote.trim(),
          priority,
          paymentMethod,
          paymentStatus,
          fee: parsedFee,
          destAddress: resolvedDest.address,
          destLat: resolvedDest.lat,
          destLng: resolvedDest.lng,
          startLat: riderLat,
          startLng: riderLng,
          deliveryCode,
          status: 'active',
          trackingState: currentGps?.isMoving ? 'live' : 'starting',
          lat: riderLat,
          lng: riderLng,
          heading: currentGps?.heading ?? null,
          speed: currentGps?.speed ?? null,
          accuracy: currentGps?.accuracy ?? null,
          isMoving: currentGps?.isMoving ?? false,
          routeDistanceMeters: straightDist,
          routeDurationSeconds: estDuration,
          sequence: 1,
          locationAt: currentGps?.updatedAt ?? Date.now(),
          heartbeatAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      sequenceRef.current = 1;
      setSelectedOrderId(orderId);
      setShowCreateForm(false);
      setCustomOrderId(generateOrderId());
      setPickupAddress('');
      setSenderName('');
      setSenderPhone('');
      setReceiverName('');
      setReceiverPhone('');
      setPackageWeight('');
      setPackageValue('');
      setIsFragile(false);
      setPackageNote('');
      setDestSearchText('');
      setSelectedDest(null);
      setTrail([]);
      toast(`Live tracking started for ${orderId}!`, 'ok');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleTogglePaymentStatus = async () => {
    if (!activeOrder) return;
    const nextStatus: PaymentStatus = activeOrder.paymentStatus === 'paid' ? 'pending' : 'paid';
    try {
      await updateDoc(orderRef(activeOrder.orderId), {
        paymentStatus: nextStatus,
        lastUpdated: serverTimestamp(),
      });
      toast(`Payment marked ${nextStatus}.`, 'ok');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${activeOrder.orderId}`);
    }
  };

  const handleCompleteDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    if (pinInput.trim() !== String(activeOrder.deliveryCode || '').trim()) {
      toast('Incorrect 4-digit PIN. Ask the customer to check their Track page.', 'err');
      return;
    }

    setCompleting(true);
    try {
      await updateDoc(orderRef(activeOrder.orderId), {
        status: 'delivered',
        trackingState: 'completed',
        isMoving: false,
        paymentStatus: 'paid',
        deliveredAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
      setPinInput('');
      toast(`Order ${activeOrder.orderId} marked Delivered!`, 'ok');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${activeOrder.orderId}`);
    } finally {
      setCompleting(false);
    }
  };

  if (!isRiderAuthed) {
    return (
      <AuthGateCard
        title="Rider Portal"
        subtitle="Sign in to start and broadcast a delivery"
        onLogin={loginRider}
      />
    );
  }

  const savedOrderRider = activeOrder ? toValidLatLng(activeOrder.lat, activeOrder.lng) : null;
  const mapRiderPos = currentGps
    ? {
        lat: currentGps.lat,
        lng: currentGps.lng,
        heading: currentGps.heading,
        isMoving: currentGps.isMoving,
        speedKmh: currentGps.speed ? Math.round(currentGps.speed * 3.6) : 0,
        label: riderName || activeOrder?.riderName || 'Rider',
      }
    : savedOrderRider && activeOrder
    ? {
        lat: savedOrderRider.lat,
        lng: savedOrderRider.lng,
        heading: activeOrder.heading != null ? Number(activeOrder.heading) : null,
        isMoving: activeOrder.isMoving ?? false,
        speedKmh: activeOrder.speed ? Math.round(activeOrder.speed * 3.6) : 0,
        label: activeOrder.riderName,
      }
    : null;

  const savedOrderDest = activeOrder ? toValidLatLng(activeOrder.destLat, activeOrder.destLng) : null;
  const mapDestPos =
    showCreateForm && selectedDest
      ? { lat: selectedDest.lat, lng: selectedDest.lng, address: selectedDest.address }
      : pendingDestPreview
      ? { lat: pendingDestPreview.lat, lng: pendingDestPreview.lng, address: pendingDestPreview.address }
      : savedOrderDest && activeOrder
      ? {
          lat: savedOrderDest.lat,
          lng: savedOrderDest.lng,
          address: activeOrder.destAddress,
        }
      : selectedDest
      ? { lat: selectedDest.lat, lng: selectedDest.lng, address: selectedDest.address }
      : null;

  const savedOrderStart = activeOrder ? toValidLatLng(activeOrder.startLat, activeOrder.startLng) : null;
  const activeProgressPct =
    activeOrder && activeOrder.status === 'delivered'
      ? 100
      : activeOrder
      ? computeProgressPct(
          mapRiderPos ? { lat: mapRiderPos.lat, lng: mapRiderPos.lng } : null,
          savedOrderStart,
          mapDestPos ? { lat: mapDestPos.lat, lng: mapDestPos.lng } : null
        ) ?? 10
      : 0;

  const trackingUrl = activeOrder
    ? `${window.location.origin}/track?id=${encodeURIComponent(activeOrder.orderId)}`
    : '';

  // Note: Delivery PIN is NEVER included in Rider WhatsApp share or Rider UI — Customer views PIN strictly on Track page
  const whatsappShareUrl = activeOrder
    ? `https://wa.me/?text=${encodeURIComponent(
        `Hi! Track your CharMary delivery (#${activeOrder.orderId}) live:\n${trackingUrl}`
      )}`
    : '#';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-7 space-y-6">
      {/* Top Rider Status Strip (GPS runs automatically on login) */}
      <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FFC107]">
            <Bike className="w-4 h-4" />
            <span>Rider Telemetry Portal · Auto-Sync Active</span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight">
            {riderName || 'CharMary Rider'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-bold ${
                currentGps
                  ? currentGps.isMoving
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-[#FFC107]/15 text-[#b48600] dark:text-[#FFC107]'
                  : 'bg-neutral-500/15 text-neutral-500'
              }`}
            >
              <Navigation className="w-3 h-3" />
              {currentGps
                ? currentGps.isMoving
                  ? 'Moving'
                  : 'Stopped'
                : 'Locking GPS...'}
            </span>

            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-white/5 px-2.5 py-1 font-mono-tabular">
              <Gauge className="w-3 h-3 text-[#FFC107]" />
              {currentGps?.speed ? `${Math.round(currentGps.speed * 3.6)} km/h` : '0 km/h'}
            </span>

            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-white/5 px-2.5 py-1 font-mono-tabular">
              <Signal className="w-3 h-3 text-emerald-500" />
              {currentGps?.accuracy != null ? `±${Math.round(currentGps.accuracy)}m` : 'Warming up'}
            </span>

            {queuedPoints.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-500 px-2.5 py-1 font-bold">
                <WifiOff className="w-3 h-3" />
                {queuedPoints.length} queued offline
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#181b24] px-3.5 py-2.5 text-xs font-bold hover:border-[#FFC107] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FFC107]" />
            <span>Sync GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFC107] text-[#0A0A0A] px-4 py-2.5 text-xs font-extrabold hover:bg-[#F2B705] transition-colors cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>{showCreateForm ? 'View Active Order' : 'New Dispatch'}</span>
          </button>

          <button
            type="button"
            onClick={logoutRider}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-3.5 py-2.5 text-xs font-bold hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Automatic Tracking Notice */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-700 dark:text-blue-200 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <span>
          GPS broadcasting, Screen Wake Lock, and destination syncing are automatic while active. Search or tap the map to pin any drop-off — it updates both your map and the customer&apos;s map instantly.
        </span>
      </div>

      {permissionDenied && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-700 dark:text-amber-300">
          Location permission is blocked. Enable Location access in your browser settings to broadcast live movement.
        </div>
      )}

      {/* Responsive Split Grid */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Map + Active Shipment Controls */}
        <div className="lg:col-span-7 min-w-0 space-y-5">
          {orders.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {orders.slice(0, 12).map((o) => {
                const selected = o.orderId === activeOrder?.orderId && !showCreateForm;
                return (
                  <button
                    key={o.orderId}
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setSelectedOrderId(o.orderId);
                      setTrail([]);
                    }}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#FFC107] text-[#0A0A0A] border-[#FFC107]'
                        : 'bg-white dark:bg-[#12141a] border-neutral-200 dark:border-white/15 hover:border-[#FFC107]'
                    }`}
                  >
                    {o.orderId} · <span className="uppercase opacity-75">{o.status || 'active'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Single Free OpenStreetMap Live Route Map — always visible & shows Rider -> Destination route */}
          <LiveTrackingMap
            theme={theme}
            riderPos={mapRiderPos}
            destPos={mapDestPos}
            startPos={savedOrderStart}
            trail={trail}
            allowMapClickDestination={true}
            onMapClickDestination={handleMapClickDestination}
            onRouteCalculated={setRouteStats}
            heightClass="h-[46dvh] min-h-[320px] sm:h-[420px] lg:h-[460px]"
          />

          {/* Active Order Panel */}
          {activeOrder && !showCreateForm && (
            <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 space-y-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 dark:border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-2xl font-black">
                      {activeOrder.orderId}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                        activeOrder.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : activeOrder.status === 'delivered'
                          ? 'bg-[#FFC107]/15 text-[#FFC107]'
                          : 'bg-red-500/15 text-red-500'
                      }`}
                    >
                      {activeOrder.status}
                    </span>
                    {activeOrder.isFragile && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-500 px-2 py-0.5 text-[11px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        Fragile
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    From: {activeOrder.senderName} ({activeOrder.senderPhone}) → To:{' '}
                    {activeOrder.receiverName} ({activeOrder.receiverPhone})
                  </div>
                </div>

                <div className="text-right font-mono-tabular text-xs">
                  <div className="font-bold text-sm">
                    {formatDistance(routeStats?.distanceMeters ?? activeOrder.routeDistanceMeters)} ·{' '}
                    {formatEta(routeStats?.durationSeconds ?? activeOrder.routeDurationSeconds)}
                  </div>
                  <div className="text-neutral-500">
                    Progress: {activeProgressPct}% · Sync {formatAgo(toMillis(activeOrder.lastUpdated))}
                  </div>
                </div>
              </div>

              {/* Fee & Payment quick strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10">
                  <span className="text-neutral-500 block">Delivery Fee</span>
                  <span className="font-bold text-sm font-mono-tabular text-[#FFC107]">
                    {formatNaira(activeOrder.fee)}
                  </span>
                </div>
                <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10">
                  <span className="text-neutral-500 block">Package</span>
                  <span className="font-bold text-sm">
                    {activeOrder.packageType}
                    {activeOrder.packageWeight ? ` · ${activeOrder.packageWeight}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleTogglePaymentStatus()}
                  className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10 text-left hover:border-[#FFC107] transition-colors cursor-pointer col-span-2 sm:col-span-1"
                >
                  <span className="text-neutral-500 block">
                    Payment ({activeOrder.paymentMethod || 'transfer'})
                  </span>
                  <span
                    className={`font-bold text-sm uppercase ${
                      activeOrder.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  >
                    {activeOrder.paymentStatus || 'pending'} (Tap to toggle)
                  </span>
                </button>
              </div>

              {/* Share Tracking Link */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={trackingUrl}
                  className="flex-1 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-xs font-mono-tabular text-neutral-600 dark:text-neutral-300"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(trackingUrl);
                      toast('Customer link copied.', 'ok');
                    } catch {
                      toast('Copy failed.', 'err');
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 dark:border-white/15 px-4 py-2.5 text-xs font-bold hover:border-[#FFC107] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-white px-4 py-2.5 text-xs font-bold hover:brightness-105"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>

              {activeOrder.status === 'active' && (
                <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#181b24] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5" />
                      <span>Set or Change Drop-off (Auto-Pins Both Maps)</span>
                    </div>
                    {updatingDest && (
                      <span className="text-[11px] font-bold text-[#FFC107]">Syncing...</span>
                    )}
                  </div>
                  <DestinationSearch
                    value={editingDestText}
                    onChangeText={setEditingDestText}
                    disabled={updatingDest}
                    onSelectDestination={(dest) => void syncDestinationToOrder(activeOrder, dest)}
                    pinnedCoords={
                      pendingDestPreview
                        ? { lat: pendingDestPreview.lat, lng: pendingDestPreview.lng }
                        : savedOrderDest
                    }
                  />
                </div>
              )}

              {/* Complete Delivery (NO PIN shown to Rider — Rider must ask customer for PIN on Track page) */}
              {activeOrder.status === 'active' && (
                <form
                  onSubmit={handleCompleteDelivery}
                  className="rounded-xl border border-[#FFC107]/40 bg-[#FFC107]/10 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4 text-[#FFC107]" />
                      <span>Complete Delivery</span>
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                      Ask receiver for their 4-digit PIN
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter customer 4-digit PIN"
                        className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#0A0A0A] pl-9 pr-3 py-2.5 text-sm font-mono-tabular tracking-widest focus:border-[#FFC107] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={completing || pinInput.length !== 4}
                      className="rounded-xl bg-[#FFC107] text-[#0A0A0A] px-5 py-2.5 text-xs font-extrabold hover:bg-[#F2B705] disabled:opacity-50 cursor-pointer"
                    >
                      {completing ? 'Completing...' : 'Verify & Deliver'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right: New Dispatch Form & Rider Credentials */}
        <div className="lg:col-span-5 min-w-0 space-y-5">
          {(showCreateForm || orders.length === 0) && (
            <form
              onSubmit={handleCreateOrder}
              className="rounded-2xl border border-[#FFC107]/40 bg-white dark:bg-[#12141a] p-5 sm:p-6 shadow-lg space-y-4"
            >
              <h2 className="font-display text-2xl font-black flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#FFC107]" />
                <span>Shipment Setup</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Order ID
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      value={customOrderId}
                      onChange={(e) => setCustomOrderId(e.target.value.toUpperCase())}
                      className="w-full min-w-0 rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm font-mono-tabular uppercase focus:border-[#FFC107] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomOrderId(generateOrderId())}
                      className="rounded-xl border border-neutral-300 dark:border-white/15 px-2.5 text-xs font-bold hover:border-[#FFC107] cursor-pointer"
                    >
                      Gen
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'standard' | 'express')}
                    className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                  >
                    <option value="standard">Standard</option>
                    <option value="express">Express</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Search Global Drop-off Destination
                </label>
                <DestinationSearch
                  value={destSearchText}
                  onChangeText={(txt) => {
                    setDestSearchText(txt);
                    if (selectedDest && txt !== selectedDest.address) {
                      setSelectedDest(null);
                    }
                  }}
                  onSelectDestination={(dest) => setSelectedDest(dest)}
                  pinnedCoords={
                    selectedDest
                      ? { lat: selectedDest.lat, lng: selectedDest.lng }
                      : null
                  }
                />
              </div>

              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Pickup address / landmark (e.g. Wetheral Road)"
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Sender Name"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                />
                <input
                  type="tel"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="Sender Phone"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                />
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Receiver Name"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                />
                <input
                  type="tel"
                  required
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  placeholder="Receiver Phone"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                >
                  <option value="Parcel">Parcel</option>
                  <option value="Food">Food</option>
                  <option value="Document">Document</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Fragile">Fragile</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Pharmacy">Pharmacy</option>
                </select>

                <input
                  type="number"
                  min={0}
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  placeholder="Delivery Fee (₦)"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm font-mono-tabular focus:border-[#FFC107] focus:outline-none"
                />

                <input
                  type="text"
                  value={packageWeight}
                  onChange={(e) => setPackageWeight(e.target.value)}
                  placeholder="Weight (e.g. 2.5 kg)"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                />

                <input
                  type="number"
                  min={0}
                  value={packageValue}
                  onChange={(e) => setPackageValue(e.target.value)}
                  placeholder="Item Value (₦ opt.)"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm font-mono-tabular focus:border-[#FFC107] focus:outline-none"
                />

                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                >
                  <option value="transfer">Bank Transfer</option>
                  <option value="cod">Cash on Delivery</option>
                  <option value="prepaid">Prepaid</option>
                </select>

                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                >
                  <option value="pending">Payment Pending</option>
                  <option value="paid">Payment Paid</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="rounded border-neutral-400 accent-[#FFC107] w-4 h-4"
                />
                <span>Mark package as Fragile / Handle with Care</span>
              </label>

              <input
                type="text"
                value={packageNote}
                onChange={(e) => setPackageNote(e.target.value)}
                placeholder="Special delivery instructions (optional)"
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />

              <button
                type="submit"
                disabled={creatingOrder}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFC107] text-[#0A0A0A] py-3 text-sm font-extrabold hover:bg-[#F2B705] disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>{creatingOrder ? 'Starting Live Broadcast...' : 'Start Tracking'}</span>
              </button>
            </form>
          )}

          {/* Rider Details Card */}
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 space-y-4"
          >
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#FFC107]" />
              <span>Rider Details</span>
            </h2>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="Rider name"
                  className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Your Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={riderPhone}
                    onChange={(e) => setRiderPhone(e.target.value)}
                    placeholder="080..."
                    className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Bike Plate
                  </label>
                  <input
                    type="text"
                    required
                    value={riderBike}
                    onChange={(e) => setRiderBike(e.target.value)}
                    placeholder="JME-123-AA"
                    className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm uppercase font-mono-tabular focus:border-[#FFC107] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 dark:border-white/15 px-4 py-2 text-xs font-bold hover:border-[#FFC107] transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#FFC107]" />
              <span>{savingProfile ? 'Saving...' : 'Save Rider Details'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
