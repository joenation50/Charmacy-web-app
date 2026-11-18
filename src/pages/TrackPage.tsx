import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Flag,
  Gauge,
  KeyRound,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Radio,
  Scale,
  Search,
  Signal,
  Sparkles,
  User,
  WifiOff,
} from 'lucide-react';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { ShippingLoader } from '../components/ShippingLoader';
import { useToast } from '../components/Toast';
import type { ThemeMode } from '../hooks/useTheme';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  computeProgressPct,
  computeStage,
  distanceMeters,
  formatAgo,
  formatDistance,
  formatEta,
  formatNaira,
  isValidLatLng,
  sanitizeOrderId,
  STAGES,
  toMillis,
  toValidLatLng,
} from '../lib/geo';
import type { DeliveryOrder, LatLngLiteral } from '../types/tracking';

interface TrackPageProps {
  theme: ThemeMode;
}

export const TrackPage: React.FC<TrackPageProps> = ({ theme }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const urlOrderId = sanitizeOrderId(searchParams.get('id') || '');
  const [orderInput, setOrderInput] = useState(urlOrderId);
  const [activeOrderId, setActiveOrderId] = useState(urlOrderId);

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [trail, setTrail] = useState<LatLngLiteral[]>([]);
  const [liveRouteStats, setLiveRouteStats] = useState<{
    distanceMeters: number;
    durationSeconds: number;
  } | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fromUrl = sanitizeOrderId(searchParams.get('id') || '');
    if (fromUrl) {
      setOrderInput(fromUrl);
      setActiveOrderId(fromUrl);
    }
  }, [searchParams]);

  // Public real-time Firestore listener on charmacy-tracking orders/{orderId}
  useEffect(() => {
    if (!activeOrderId) {
      setOrder(null);
      setNotFound(false);
      return;
    }

    setLoadingOrder(true);
    setNotFound(false);
    setTrail([]);
    setLiveRouteStats(null);

    const path = `orders/${activeOrderId}`;
    const unsub = onSnapshot(
      doc(db, 'orders', activeOrderId),
      (snap) => {
        setLoadingOrder(false);
        if (!snap.exists()) {
          setOrder(null);
          setNotFound(true);
          return;
        }
        const raw = snap.data() as Partial<DeliveryOrder>;
        const normalized: DeliveryOrder = {
          ...(raw as DeliveryOrder),
          orderId: raw.orderId || snap.id,
        };
        setOrder(normalized);
        setNotFound(false);

        const pt = toValidLatLng(normalized.lat, normalized.lng);
        if (pt) {
          setTrail((prev) => {
            const last = prev[prev.length - 1];
            if (last && distanceMeters(last, pt) < 6) return prev;
            return [...prev.slice(-119), pt];
          });
        }
      },
      (err) => {
        setLoadingOrder(false);
        handleFirestoreError(err, OperationType.GET, path);
      }
    );

    return () => unsub();
  }, [activeOrderId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeOrderId(orderInput);
    if (!clean || clean.length < 4) {
      toast('Enter a valid Order ID (e.g. CH-90210).', 'err');
      return;
    }
    setActiveOrderId(clean);
    setSearchParams({ id: clean });
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied.`, 'ok');
    } catch {
      toast(`Unable to copy ${label.toLowerCase()}.`, 'err');
    }
  };

  const riderPos = useMemo(() => {
    if (!order) return null;
    const pos = toValidLatLng(order.lat, order.lng);
    if (!pos) return null;
    const speedKmh =
      typeof order.speed === 'number' && Number.isFinite(order.speed)
        ? Math.round(order.speed * 3.6)
        : 0;
    return {
      lat: pos.lat,
      lng: pos.lng,
      heading: order.heading != null ? Number(order.heading) : null,
      isMoving: order.isMoving ?? (order.trackingState === 'live' && speedKmh > 1),
      speedKmh,
      label: order.riderName || 'CharMary Rider',
    };
  }, [order]);

  const destPos = useMemo(() => {
    if (!order) return null;
    const pos = toValidLatLng(order.destLat, order.destLng);
    if (!pos) return null;
    return {
      lat: pos.lat,
      lng: pos.lng,
      address: order.destAddress || `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
    };
  }, [order]);

  const startPos = useMemo(() => {
    if (!order) return null;
    const pos = toValidLatLng(order.startLat, order.startLng);
    if (!pos) return null;
    if (destPos && distanceMeters(pos, destPos) < 25) return null;
    return pos;
  }, [order, destPos]);

  const progressPct = useMemo(() => {
    if (!order) return 0;
    if (order.status === 'delivered') return 100;
    return (
      computeProgressPct(
        riderPos ? { lat: riderPos.lat, lng: riderPos.lng } : null,
        startPos,
        destPos ? { lat: destPos.lat, lng: destPos.lng } : null
      ) ?? (riderPos ? 15 : 5)
    );
  }, [order, riderPos, startPos, destPos]);

  const stageIdx = useMemo(() => {
    if (!order) return 0;
    return computeStage(
      order.status,
      Boolean(order.riderName),
      Boolean(riderPos),
      progressPct
    );
  }, [order, riderPos, progressPct]);

  const lastSignalMs = toMillis(order?.locationAt) || toMillis(order?.lastUpdated);
  const createdMs = toMillis(order?.createdAt);
  const deliveredMs = toMillis(order?.deliveredAt);
  const isStale = Boolean(
    order?.status === 'active' &&
      lastSignalMs > 0 &&
      nowTick - lastSignalMs > 60000
  );

  const effectiveDistance =
    liveRouteStats?.distanceMeters ?? order?.routeDistanceMeters ?? null;
  const effectiveDuration =
    liveRouteStats?.durationSeconds ?? order?.routeDurationSeconds ?? null;

  const riderInitials = (order?.riderName || 'CR')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const riderWaUrl = order?.riderPhone
    ? `https://wa.me/${order.riderPhone.replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(
        `Hi ${order.riderName || 'Rider'}, checking on CharMary Order #${order.orderId}.`
      )}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Search & Order Header */}
      <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#FFC107]">
              <Radio className="w-3.5 h-3.5" />
              <span>Real-Time Delivery Tracking</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">
              {activeOrderId ? `Order #${activeOrderId}` : 'Track Your Delivery'}
            </h1>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                placeholder="Order ID or tracking link (e.g. CH-90210)"
                className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] pl-10 pr-3 py-2.5 text-sm font-semibold focus:border-[#FFC107] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#FFC107] text-[#0A0A0A] px-5 py-2.5 text-sm font-extrabold hover:bg-[#F2B705] transition-colors shrink-0 cursor-pointer"
            >
              Locate
            </button>
          </form>
        </div>
      </div>

      {/* Empty State */}
      {!activeOrderId && (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-white/15 bg-white dark:bg-[#12141a] p-10 text-center space-y-3">
          <Package className="w-10 h-10 text-[#FFC107] mx-auto" />
          <h2 className="font-display text-2xl font-bold">Enter Your Order ID Above</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Paste your CharMary Order ID or full tracking link to watch live rider movement, stops, route ETA, journey progress, and drop-off location.
          </p>
        </div>
      )}

      {/* Animated Shipping Loader */}
      {loadingOrder && (
        <ShippingLoader
          title={`Connecting to Order #${activeOrderId}`}
          subtitle="Syncing live rider coordinates, destination pin, and package telemetry..."
        />
      )}

      {/* Not Found State */}
      {notFound && !loadingOrder && activeOrderId && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center space-y-2">
          <h2 className="font-display text-2xl font-bold text-red-500">
            Order #{activeOrderId} Not Found
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Double-check the Order ID sent by CharMary Dispatch or ask your rider to start live broadcasting.
          </p>
        </div>
      )}

      {/* Active Tracking View */}
      {order && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          {/* Delivered / Cancelled Banner */}
          {order.status === 'delivered' && (
            <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    Package Delivered Successfully
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                    Order #{order.orderId} arrived safely
                    {deliveredMs ? ` (${formatAgo(deliveredMs)})` : ''}. Thank you for choosing CharMary.
                  </p>
                </div>
              </div>
              <span className="font-display text-3xl font-black text-emerald-500 tabular-nums">
                100%
              </span>
            </div>
          )}

          {order.status === 'cancelled' && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-sm font-semibold text-red-500">
              Order #{order.orderId} has been cancelled. Contact CharMary Dispatch on 0808 727 6942 for assistance.
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left / Main: Progress, Live Telemetry & Map */}
            <div className="lg:col-span-8 min-w-0 space-y-5">
              {/* Motion, Journey Progress & Telemetry Strip */}
              <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="font-display text-5xl font-black text-[#FFC107] tabular-nums leading-none">
                      {progressPct}%
                    </div>
                    <div className="space-y-1">
                      <div className="text-base font-extrabold flex flex-wrap items-center gap-2">
                        <span>{STAGES[stageIdx]?.label || 'In Progress'}</span>
                        {order.status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : order.status === 'cancelled' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 text-red-500 px-2.5 py-0.5 text-[11px] font-bold">
                            Cancelled
                          </span>
                        ) : isStale ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 text-[11px] font-bold">
                            <WifiOff className="w-3 h-3" />
                            Signal Delayed
                          </span>
                        ) : riderPos?.isMoving ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-bold">
                            <Navigation className="w-3 h-3" />
                            On the Move
                          </span>
                        ) : riderPos ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#FFC107]/15 text-[#b48600] dark:text-[#FFC107] px-2.5 py-0.5 text-[11px] font-bold">
                            <Clock className="w-3 h-3" />
                            Rider Stopped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 text-blue-500 px-2.5 py-0.5 text-[11px] font-bold">
                            Waiting for GPS
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Updated {formatAgo(lastSignalMs)} · Telemetry Seq #{order.sequence || 0}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleCopyText(
                        `${window.location.origin}/track?id=${encodeURIComponent(order.orderId)}`,
                        'Tracking link'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 dark:border-white/15 px-3.5 py-2 text-xs font-bold hover:border-[#FFC107] transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Share Tracking Link</span>
                  </button>
                </div>

                {/* Animated Progress Track with Moving Bike Icon */}
                <div className="relative pt-1">
                  <div className="h-3 w-full rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-[#FFC107] via-amber-400 to-emerald-500"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    {STAGES.map((st, idx) => (
                      <div
                        key={st.key}
                        className={`truncate ${
                          idx === stageIdx
                            ? 'text-[#FFC107]'
                            : idx < stageIdx
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'opacity-60'
                        }`}
                      >
                        {st.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dedicated Telemetry Metric Grid (Never covered by map UI) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] p-3.5 border border-neutral-200 dark:border-white/10">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      Distance Left
                    </div>
                    <div className="mt-1 font-display text-2xl font-black tabular-nums">
                      {order.status === 'delivered' ? '0 m' : formatDistance(effectiveDistance)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] p-3.5 border border-neutral-200 dark:border-white/10">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      Estimated ETA
                    </div>
                    <div className="mt-1 font-display text-2xl font-black tabular-nums">
                      {order.status === 'delivered' ? 'Arrived' : formatEta(effectiveDuration)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] p-3.5 border border-neutral-200 dark:border-white/10">
                    <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      <Gauge className="w-3 h-3 text-[#FFC107]" />
                      <span>Speed</span>
                    </div>
                    <div className="mt-1 font-display text-2xl font-black tabular-nums">
                      {riderPos ? `${riderPos.speedKmh} km/h` : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] p-3.5 border border-neutral-200 dark:border-white/10">
                    <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      <Signal className="w-3 h-3 text-emerald-500" />
                      <span>GPS Signal</span>
                    </div>
                    <div className="mt-1 font-display text-2xl font-black tabular-nums">
                      {order.accuracy != null ? `±${Math.round(order.accuracy)}m` : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Waiting GPS Animation if active but no rider coordinate yet */}
              {!riderPos && order.status === 'active' && (
                <ShippingLoader
                  title="Waiting for Rider GPS Signal"
                  subtitle="The shipment is registered in Firestore. Live map markers will appear immediately once GPS locks."
                />
              )}

              {/* Free Reliable Map showing Rider + Destination Drop-off + Origin */}
              <LiveTrackingMap
                theme={theme}
                riderPos={riderPos}
                destPos={destPos}
                startPos={startPos}
                trail={trail}
                onRouteCalculated={setLiveRouteStats}
                heightClass="h-[48dvh] min-h-[320px] sm:h-[430px] lg:h-[470px]"
              />
            </div>

            {/* Right Column: Rider Card, Sender/Receiver Journey, Package Specs, PIN & Stages */}
            <div className="lg:col-span-4 min-w-0 space-y-5">
              {/* Modern Assigned Rider Card */}
              <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#FFC107] flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5" />
                    <span>Courier Rider</span>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-neutral-500">
                    {order.riderBike || 'Dispatch Bike'}
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFC107] to-amber-300 text-[#0A0A0A] font-display text-xl font-black flex items-center justify-center shrink-0 shadow">
                    {riderInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-xl font-black truncate">
                      {order.riderName || 'Assigned Rider'}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono-tabular">
                      {order.riderPhone || 'Phone available on dispatch'}
                    </div>
                  </div>
                </div>

                {(order.riderPhone || riderWaUrl) && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {order.riderPhone && (
                      <a
                        href={`tel:${order.riderPhone}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 py-2.5 text-xs font-bold hover:bg-emerald-500/25 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Rider</span>
                      </a>
                    )}
                    {riderWaUrl && (
                      <a
                        href={riderWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366]/15 text-[#1b9e4b] dark:text-[#25D366] py-2.5 text-xs font-bold hover:bg-[#25D366]/25 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                )}

                {riderPos && (
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] px-3 py-2 text-[11px] font-mono-tabular text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
                    <span>Live GPS Fix</span>
                    <span>
                      {riderPos.lat.toFixed(5)}, {riderPos.lng.toFixed(5)}
                    </span>
                  </div>
                )}
              </div>

              {/* Modern Sender & Receiver Route Card */}
              <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 space-y-4 shadow-sm">
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Flag className="w-4 h-4 text-emerald-500" />
                  <span>Sender &amp; Receiver Route</span>
                </h2>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                    <span className="w-0.5 flex-1 min-h-[42px] border-l-2 border-dashed border-neutral-300 dark:border-white/20 my-1" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                  </div>

                  <div className="flex-1 space-y-4 min-w-0">
                    {/* Sender */}
                    <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-500">
                        <span>Sender · Origin</span>
                        {createdMs > 0 && (
                          <span className="text-neutral-400">{formatAgo(createdMs)}</span>
                        )}
                      </div>
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{order.senderName || 'Sender'}</span>
                      </div>
                      {order.pickupAddress && (
                        <div className="text-xs text-neutral-600 dark:text-neutral-300">
                          {order.pickupAddress}
                        </div>
                      )}
                      {order.senderPhone && (
                        <a
                          href={`tel:${order.senderPhone}`}
                          className="inline-block text-xs font-mono-tabular text-neutral-500 hover:text-[#FFC107]"
                        >
                          {order.senderPhone}
                        </a>
                      )}
                    </div>

                    {/* Receiver / Drop-off */}
                    <div className="rounded-xl bg-emerald-500/10 p-3 border border-emerald-500/30 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Receiver · Drop-off
                      </div>
                      <div className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                        {order.receiverName || 'Receiver'}
                      </div>
                      <div className="text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed">
                        {destPos?.address || 'Pinned destination'}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        {order.receiverPhone && (
                          <a
                            href={`tel:${order.receiverPhone}`}
                            className="text-xs font-mono-tabular text-neutral-600 dark:text-neutral-300 hover:text-[#FFC107]"
                          >
                            {order.receiverPhone}
                          </a>
                        )}
                        {destPos && (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${destPos.lat}&mlon=${destPos.lng}#map=16/${destPos.lat}/${destPos.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            <span>Open Map</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extended Package & Payment Info */}
              <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#FFC107]" />
                    <span>Shipment Specs</span>
                  </h2>
                  {order.isFragile && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-500 px-2 py-0.5 text-[11px] font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      Fragile
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10">
                    <span className="text-neutral-500 block">Package Type</span>
                    <span className="font-bold text-sm">{order.packageType || 'Parcel'}</span>
                  </div>
                  <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10">
                    <span className="text-neutral-500 block">Priority</span>
                    <span className="font-bold text-sm capitalize">
                      {order.priority || 'Standard'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10">
                    <span className="text-neutral-500 block">Delivery Fee</span>
                    <span className="font-bold text-sm font-mono-tabular text-[#FFC107]">
                      {formatNaira(order.fee)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10">
                    <span className="text-neutral-500 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> Payment
                    </span>
                    <span className="font-bold text-sm capitalize">
                      {order.paymentMethod || 'Transfer'} ·{' '}
                      <span
                        className={
                          order.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'
                        }
                      >
                        {order.paymentStatus || 'Pending'}
                      </span>
                    </span>
                  </div>
                  {order.packageWeight && (
                    <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10">
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Scale className="w-3 h-3" /> Weight
                      </span>
                      <span className="font-bold text-sm">{order.packageWeight}</span>
                    </div>
                  )}
                  {order.packageValue != null && Number(order.packageValue) > 0 && (
                    <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-3 border border-neutral-200 dark:border-white/10">
                      <span className="text-neutral-500 block">Declared Value</span>
                      <span className="font-bold text-sm font-mono-tabular">
                        {formatNaira(order.packageValue)}
                      </span>
                    </div>
                  )}
                </div>

                {order.packageNote && (
                  <div className="rounded-xl bg-neutral-100 dark:bg-[#181b24] p-3 text-xs text-neutral-700 dark:text-neutral-300">
                    <strong>Handling Note:</strong> {order.packageNote}
                  </div>
                )}
              </div>

              {/* Delivery PIN */}
              {order.deliveryCode && (
                <div className="rounded-2xl border-2 border-dashed border-[#FFC107] bg-[#FFC107]/10 p-5 text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FFC107]">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Delivery PIN</span>
                  </div>
                  <div className="font-display text-4xl font-black tracking-[0.35em] text-[#FFC107] pl-2">
                    {order.deliveryCode}
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                    Share this 4-digit PIN with your rider at drop-off
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCopyText(order.deliveryCode, 'Delivery PIN')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FFC107] hover:underline cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy PIN</span>
                  </button>
                </div>
              )}

              {/* 6-Stage Delivery Timeline */}
              <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 space-y-4 shadow-sm">
                <h2 className="font-display text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFC107]" />
                  <span>Journey Milestones</span>
                </h2>
                <ol className="space-y-3">
                  {STAGES.map((st, idx) => {
                    const done = idx <= stageIdx;
                    const current = idx === stageIdx;
                    return (
                      <li key={st.key} className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 transition-colors ${
                            current
                              ? 'bg-[#FFC107] text-[#0A0A0A] ring-4 ring-[#FFC107]/25'
                              : done
                              ? 'bg-emerald-500 text-white'
                              : 'bg-neutral-200 dark:bg-white/10 text-neutral-500'
                          }`}
                        >
                          {done && !current ? '✓' : idx + 1}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            current
                              ? 'text-[#FFC107] font-bold'
                              : done
                              ? 'text-neutral-900 dark:text-white'
                              : 'text-neutral-400'
                          }`}
                        >
                          {st.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
