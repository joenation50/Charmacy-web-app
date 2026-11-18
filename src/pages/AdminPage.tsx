import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Bike,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  KeyRound,
  Layers,
  LogOut,
  Navigation,
  Package,
  PackagePlus,
  Save,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { AuthGateCard } from '../components/AuthGateCard';
import { DestinationSearch } from '../components/DestinationSearch';
import { FleetMarkerItem, LiveTrackingMap } from '../components/LiveTrackingMap';
import { useToast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import type { ThemeMode } from '../hooks/useTheme';
import { db, handleFirestoreError, OperationType, orderRef } from '../lib/firebase';
import { distanceMeters, formatAgo, formatNaira, isValidLatLng, searchGlobalPlaces, toMillis, toValidLatLng } from '../lib/geo';
import type {
  DeliveryOrder,
  DestinationSelection,
  PaymentMethod,
  PaymentStatus,
} from '../types/tracking';

interface AdminPageProps {
  theme: ThemeMode;
}

type FilterMode = 'all' | 'active' | 'moving' | 'stopped' | 'delivered' | 'cancelled';

function generateOrderId(): string {
  return `CH-${Math.floor(10000 + Math.random() * 90000)}`;
}

export const AdminPage: React.FC<AdminPageProps> = ({ theme }) => {
  const { isAdminAuthed, loginAdmin, logoutAdmin } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [inspectedOrderId, setInspectedOrderId] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState(false);

  // Admin Create Dispatch Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrderId, setNewOrderId] = useState(generateOrderId);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [newRiderBike, setNewRiderBike] = useState('');
  const [newPickupAddress, setNewPickupAddress] = useState('');
  const [newSenderName, setNewSenderName] = useState('');
  const [newSenderPhone, setNewSenderPhone] = useState('');
  const [newReceiverName, setNewReceiverName] = useState('');
  const [newReceiverPhone, setNewReceiverPhone] = useState('');
  const [newPackageType, setNewPackageType] = useState('Parcel');
  const [newPackageWeight, setNewPackageWeight] = useState('');
  const [newPackageValue, setNewPackageValue] = useState('');
  const [newIsFragile, setNewIsFragile] = useState(false);
  const [newPriority, setNewPriority] = useState<'standard' | 'express'>('standard');
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>('transfer');
  const [newPaymentStatus, setNewPaymentStatus] = useState<PaymentStatus>('pending');
  const [newFee, setNewFee] = useState('1500');
  const [newNote, setNewNote] = useState('');
  const [newDestText, setNewDestText] = useState('');
  const [newDest, setNewDest] = useState<DestinationSelection | null>(null);
  const [creatingDispatch, setCreatingDispatch] = useState(false);

  // Inspection Modal Inline Edit State
  const [editRiderName, setEditRiderName] = useState('');
  const [editRiderPhone, setEditRiderPhone] = useState('');
  const [editRiderBike, setEditRiderBike] = useState('');
  const [editDestText, setEditDestText] = useState('');
  const [editDest, setEditDest] = useState<DestinationSelection | null>(null);

  // Listen to all orders in charmacy-tracking Firestore
  useEffect(() => {
    if (!isAdminAuthed) {
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
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    return () => unsub();
  }, [isAdminAuthed]);

  const inspectedOrder = useMemo(
    () => orders.find((o) => o.orderId === inspectedOrderId) || null,
    [orders, inspectedOrderId]
  );

  useEffect(() => {
    if (inspectedOrder) {
      setEditRiderName(inspectedOrder.riderName || '');
      setEditRiderPhone(inspectedOrder.riderPhone || '');
      setEditRiderBike(inspectedOrder.riderBike || '');
      setEditDestText(inspectedOrder.destAddress || '');
      setEditDest(null);
    }
  }, [inspectedOrder?.orderId]);

  const kpis = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
    const moving = orders.filter(
      (o) => o.status === 'active' && (o.isMoving ?? o.trackingState === 'live')
    ).length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const totalFees = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((acc, o) => acc + (Number(o.fee) || 0), 0);
    return { active, moving, delivered, totalOrders: orders.length, totalFees };
  }, [orders]);

  const fleetMarkers = useMemo<FleetMarkerItem[]>(() => {
    const items: FleetMarkerItem[] = [];
    orders.forEach((o) => {
      if (o.status === 'delivered' || o.status === 'cancelled') return;
      const riderPos = toValidLatLng(o.lat, o.lng);
      const destPos = toValidLatLng(o.destLat, o.destLng);
      if (!riderPos) return;
      items.push({
        id: o.orderId,
        lat: riderPos.lat,
        lng: riderPos.lng,
        destLat: destPos?.lat,
        destLng: destPos?.lng,
        destLabel: o.destAddress,
        heading: o.heading != null ? Number(o.heading) : null,
        isMoving: o.isMoving ?? o.trackingState === 'live',
        label: `${o.orderId} · ${(o.riderName || 'Rider').split(' ')[0]}`,
        sublabel: o.destAddress,
        onSelect: () => setInspectedOrderId(o.orderId),
      });
    });
    return items;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      const isActive = o.status !== 'delivered' && o.status !== 'cancelled';
      if (filterMode === 'active' && !isActive) return false;
      if (filterMode === 'moving' && !(isActive && o.isMoving)) return false;
      if (filterMode === 'stopped' && !(isActive && !o.isMoving)) return false;
      if (filterMode === 'delivered' && o.status !== 'delivered') return false;
      if (filterMode === 'cancelled' && o.status !== 'cancelled') return false;

      if (!q) return true;
      return [
        o.orderId,
        o.riderName,
        o.riderPhone,
        o.senderName,
        o.senderPhone,
        o.receiverName,
        o.receiverPhone,
        o.pickupAddress,
        o.destAddress,
        o.packageType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [orders, searchTerm, filterMode]);

  const handleAdminCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = newOrderId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!/^[A-Z0-9-]{4,40}$/.test(orderId)) {
      toast('Order ID must be 4–40 letters/numbers/hyphens.', 'err');
      return;
    }
    let resolvedDest = newDest;
    if (!resolvedDest && newDestText.trim().length >= 2) {
      setCreatingDispatch(true);
      try {
        const matches = await searchGlobalPlaces(newDestText.trim());
        if (matches.length > 0) {
          const top = matches[0];
          const label =
            top.source === 'coords'
              ? `${top.coords.lat.toFixed(5)}, ${top.coords.lng.toFixed(5)}`
              : [top.title, top.subtitle].filter(Boolean).join(', ');
          resolvedDest = { lat: top.coords.lat, lng: top.coords.lng, address: label };
          setNewDest(resolvedDest);
          setNewDestText(label);
        }
      } catch {
        // handled below
      }
    }

    if (!resolvedDest || !isValidLatLng(resolvedDest.lat, resolvedDest.lng)) {
      setCreatingDispatch(false);
      toast('Select a drop-off destination from global search.', 'err');
      return;
    }

    const deliveryCode = String(Math.floor(1000 + Math.random() * 9000));
    const parsedFee = Math.max(0, Number(newFee) || 0);
    const parsedValue = newPackageValue ? Math.max(0, Number(newPackageValue) || 0) : null;

    setCreatingDispatch(true);
    try {
      await setDoc(
        orderRef(orderId),
        {
          orderId,
          riderUid: 'admin-dispatch',
          riderName: (newRiderName || 'CharMary Rider').trim(),
          riderPhone: (newRiderPhone || '08087276942').trim(),
          riderBike: (newRiderBike || 'CM-01').trim().toUpperCase(),
          pickupAddress: newPickupAddress.trim(),
          senderName: newSenderName.trim(),
          senderPhone: newSenderPhone.trim(),
          receiverName: newReceiverName.trim(),
          receiverPhone: newReceiverPhone.trim(),
          packageType: newPackageType,
          packageWeight: newPackageWeight.trim(),
          packageValue: parsedValue,
          isFragile: newIsFragile,
          packageNote: newNote.trim(),
          priority: newPriority,
          paymentMethod: newPaymentMethod,
          paymentStatus: newPaymentStatus,
          fee: parsedFee,
          destAddress: resolvedDest.address,
          destLat: resolvedDest.lat,
          destLng: resolvedDest.lng,
          startLat: null,
          startLng: null,
          deliveryCode,
          status: 'active',
          trackingState: 'starting',
          lat: null,
          lng: null,
          heading: null,
          speed: null,
          accuracy: null,
          isMoving: false,
          routeDistanceMeters: 0,
          routeDurationSeconds: 0,
          sequence: 0,
          locationAt: null,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      setShowCreateModal(false);
      setNewOrderId(generateOrderId());
      setNewPickupAddress('');
      setNewSenderName('');
      setNewSenderPhone('');
      setNewReceiverName('');
      setNewReceiverPhone('');
      setNewPackageWeight('');
      setNewPackageValue('');
      setNewIsFragile(false);
      setNewNote('');
      setNewDestText('');
      setNewDest(null);
      toast(`Dispatch ${orderId} created! PIN: ${deliveryCode}`, 'ok');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
    } finally {
      setCreatingDispatch(false);
    }
  };

  const handleSaveInspectionEdits = async () => {
    if (!inspectedOrder) return;
    setUpdatingOrder(true);
    try {
      const payload: Record<string, unknown> = {
        riderName: editRiderName.trim() || inspectedOrder.riderName,
        riderPhone: editRiderPhone.trim() || inspectedOrder.riderPhone,
        riderBike: editRiderBike.trim().toUpperCase() || inspectedOrder.riderBike,
        lastUpdated: serverTimestamp(),
      };
      if (editDest && isValidLatLng(editDest.lat, editDest.lng)) {
        payload.destAddress = editDest.address;
        payload.destLat = editDest.lat;
        payload.destLng = editDest.lng;
        const liveOrigin = toValidLatLng(inspectedOrder.lat, inspectedOrder.lng);
        if (liveOrigin) {
          const d = distanceMeters(liveOrigin, editDest);
          payload.routeDistanceMeters = Math.round(d);
          payload.routeDurationSeconds = Math.max(60, Math.round((d / 1000 / 26) * 3600));
        }
      }
      await updateDoc(orderRef(inspectedOrder.orderId), payload);
      setEditDest(null);
      toast(`Updated dispatch #${inspectedOrder.orderId}.`, 'ok');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${inspectedOrder.orderId}`);
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleTogglePayment = async (order: DeliveryOrder) => {
    const next: PaymentStatus = order.paymentStatus === 'paid' ? 'pending' : 'paid';
    setUpdatingOrder(true);
    try {
      await updateDoc(orderRef(order.orderId), {
        paymentStatus: next,
        lastUpdated: serverTimestamp(),
      });
      toast(`Payment status set to ${next}.`, 'ok');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.orderId}`);
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleAdminOrderStatus = async (
    order: DeliveryOrder,
    nextStatus: 'delivered' | 'cancelled'
  ) => {
    setUpdatingOrder(true);
    try {
      const payload: Record<string, unknown> = {
        status: nextStatus,
        trackingState: nextStatus === 'delivered' ? 'completed' : 'cancelled',
        isMoving: false,
        lastUpdated: serverTimestamp(),
      };
      if (nextStatus === 'delivered') {
        payload.deliveredAt = serverTimestamp();
        payload.paymentStatus = 'paid';
      }
      await updateDoc(orderRef(order.orderId), payload);
      toast(`Order ${order.orderId} marked ${nextStatus}.`, 'ok');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.orderId}`);
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleExportCsv = () => {
    if (!filteredOrders.length) {
      toast('No orders to export.', 'err');
      return;
    }
    const header = [
      'OrderID',
      'Status',
      'TrackingState',
      'Rider',
      'RiderPhone',
      'Bike',
      'Sender',
      'PickupAddress',
      'Receiver',
      'Destination',
      'PackageType',
      'Weight',
      'Fragile',
      'PaymentMethod',
      'PaymentStatus',
      'FeeNGN',
      'PIN',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderId,
      o.status || 'active',
      o.trackingState || '',
      `"${(o.riderName || '').replace(/"/g, '""')}"`,
      o.riderPhone || '',
      o.riderBike || '',
      `"${(o.senderName || '').replace(/"/g, '""')}"`,
      `"${(o.pickupAddress || '').replace(/"/g, '""')}"`,
      `"${(o.receiverName || '').replace(/"/g, '""')}"`,
      `"${(o.destAddress || '').replace(/"/g, '""')}"`,
      o.packageType || '',
      o.packageWeight || '',
      o.isFragile ? 'Yes' : 'No',
      o.paymentMethod || 'transfer',
      o.paymentStatus || 'pending',
      String(o.fee ?? 0),
      o.deliveryCode || '',
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charmary_deliveries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported.', 'ok');
  };

  if (!isAdminAuthed) {
    return (
      <AuthGateCard
        title="Admin Console"
        subtitle="Live delivery operations"
        onLogin={loginAdmin}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#FFC107]">
            <ShieldCheck className="w-4 h-4" />
            <span>Fleet Command Center</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">
            Admin Dispatch Console
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FFC107] text-[#0A0A0A] px-4 py-2.5 text-xs font-extrabold hover:bg-[#F2B705] transition-colors cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Create Dispatch</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#12141a] px-4 py-2.5 text-xs font-extrabold hover:border-[#FFC107] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#FFC107]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={logoutAdmin}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-3.5 py-2.5 text-xs font-bold hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500">
            <span>Active / Moving</span>
            <Navigation className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-display text-4xl font-black tabular-nums">
            {kpis.active}{' '}
            <span className="text-lg font-bold text-emerald-500">({kpis.moving} live)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500">
            <span>Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-[#FFC107]" />
          </div>
          <div className="mt-2 font-display text-4xl font-black tabular-nums">
            {kpis.delivered}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 font-display text-4xl font-black tabular-nums">
            {kpis.totalOrders}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500">
            <span>Total Fees</span>
            <Layers className="w-4 h-4 text-[#FFC107]" />
          </div>
          <div className="mt-2 font-display text-3xl sm:text-4xl font-black tabular-nums text-[#FFC107]">
            {formatNaira(kpis.totalFees)}
          </div>
        </div>
      </div>

      {/* Live Fleet Command Map */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2">
            <Bike className="w-5 h-5 text-[#FFC107]" />
            <span>Live Fleet Map ({fleetMarkers.length} active bikes)</span>
          </h2>
          <span className="text-xs text-neutral-500">
            Tap any yellow rider badge on the map to inspect order telemetry
          </span>
        </div>
        <LiveTrackingMap
          theme={theme}
          fleetMarkers={fleetMarkers}
          heightClass="h-[42dvh] min-h-[300px] sm:h-[400px] lg:h-[430px]"
        />
      </div>

      {/* Search, Filters & Orders List */}
      <div className="rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order, rider, sender, receiver or phone..."
              className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] pl-10 pr-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', 'All'],
                ['active', 'Active'],
                ['moving', 'Moving'],
                ['stopped', 'Stopped'],
                ['delivered', 'Delivered'],
                ['cancelled', 'Cancelled'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterMode(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  filterMode === key
                    ? 'bg-[#FFC107] text-[#0A0A0A]'
                    : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-sm text-neutral-500">
            No shipments match this view.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="py-3 pr-4">Order</th>
                  <th className="py-3 pr-4">Destination</th>
                  <th className="py-3 pr-4">Rider</th>
                  <th className="py-3 pr-4">Motion / Status</th>
                  <th className="py-3 pr-4">Fee / Payment</th>
                  <th className="py-3 pr-4">Updated</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-white/10">
                {filteredOrders.map((o) => (
                  <tr
                    key={o.orderId}
                    className="hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 pr-4 font-mono-tabular font-bold whitespace-nowrap">
                      {o.orderId}
                    </td>
                    <td className="py-3 pr-4 max-w-[230px] truncate" title={o.destAddress}>
                      {o.destAddress || '—'}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <div className="font-semibold">{o.riderName || 'Unassigned'}</div>
                      <div className="text-xs text-neutral-500 font-mono-tabular">
                        {o.riderBike || '—'}
                      </div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {o.status === 'delivered' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#FFC107]/15 text-[#b48600] dark:text-[#FFC107] px-2 py-0.5 text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Delivered
                        </span>
                      ) : o.status === 'cancelled' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 text-red-500 px-2 py-0.5 text-xs font-bold">
                          <XCircle className="w-3 h-3" />
                          Cancelled
                        </span>
                      ) : o.isMoving ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-500 px-2 py-0.5 text-xs font-bold">
                          <Navigation className="w-3 h-3" />
                          Moving
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-500 px-2 py-0.5 text-xs font-bold">
                          <Clock className="w-3 h-3" />
                          Stopped
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <div className="font-mono-tabular font-semibold">{formatNaira(o.fee)}</div>
                      <div className="text-[11px] uppercase font-bold text-neutral-500">
                        {o.paymentStatus || 'pending'}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-neutral-500 whitespace-nowrap">
                      {formatAgo(toMillis(o.locationAt) || toMillis(o.lastUpdated))}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setInspectedOrderId(o.orderId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-white/15 px-2.5 py-1.5 text-xs font-bold hover:border-[#FFC107] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const url = `${window.location.origin}/track?id=${encodeURIComponent(o.orderId)}`;
                          try {
                            await navigator.clipboard.writeText(url);
                            toast(`Copied link for ${o.orderId}`, 'ok');
                          } catch {
                            toast('Copy failed', 'err');
                          }
                        }}
                        title="Copy customer tracking link"
                        className="inline-flex items-center justify-center rounded-lg border border-neutral-300 dark:border-white/15 p-1.5 text-xs hover:border-[#FFC107] cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Create New Dispatch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[1100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleAdminCreateDispatch}
            className="w-full max-w-2xl rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-3">
              <h3 className="font-display text-2xl font-black flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-[#FFC107]" />
                <span>Create New Dispatch</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  value={newOrderId}
                  onChange={(e) => setNewOrderId(e.target.value.toUpperCase())}
                  placeholder="Order ID"
                  className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm font-mono-tabular uppercase focus:border-[#FFC107] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNewOrderId(generateOrderId())}
                  className="rounded-xl border border-neutral-300 dark:border-white/15 px-3 text-xs font-bold hover:border-[#FFC107] cursor-pointer"
                >
                  Gen
                </button>
              </div>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as 'standard' | 'express')}
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              >
                <option value="standard">Standard Priority</option>
                <option value="express">Express Priority</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Drop-off Destination (Global Search)
              </label>
              <DestinationSearch
                value={newDestText}
                onChangeText={setNewDestText}
                onSelectDestination={(d) => setNewDest(d)}
                pinnedCoords={newDest ? { lat: newDest.lat, lng: newDest.lng } : null}
              />
            </div>

            <input
              type="text"
              value={newPickupAddress}
              onChange={(e) => setNewPickupAddress(e.target.value)}
              placeholder="Pickup address / landmark"
              className="w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
            />

            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newSenderName}
                onChange={(e) => setNewSenderName(e.target.value)}
                placeholder="Sender Name"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />
              <input
                type="tel"
                required
                value={newSenderPhone}
                onChange={(e) => setNewSenderPhone(e.target.value)}
                placeholder="Sender Phone"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />
              <input
                type="text"
                required
                value={newReceiverName}
                onChange={(e) => setNewReceiverName(e.target.value)}
                placeholder="Receiver Name"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />
              <input
                type="tel"
                required
                value={newReceiverPhone}
                onChange={(e) => setNewReceiverPhone(e.target.value)}
                placeholder="Receiver Phone"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3.5 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newRiderName}
                onChange={(e) => setNewRiderName(e.target.value)}
                placeholder="Assigned Rider Name"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />
              <input
                type="tel"
                value={newRiderPhone}
                onChange={(e) => setNewRiderPhone(e.target.value)}
                placeholder="Rider Phone"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />
              <input
                type="text"
                value={newRiderBike}
                onChange={(e) => setNewRiderBike(e.target.value)}
                placeholder="Bike Plate"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm uppercase font-mono-tabular focus:border-[#FFC107] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <select
                value={newPackageType}
                onChange={(e) => setNewPackageType(e.target.value)}
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              >
                <option value="Parcel">Parcel</option>
                <option value="Food">Food</option>
                <option value="Document">Document</option>
                <option value="Electronics">Electronics</option>
                <option value="Fragile">Fragile</option>
                <option value="Pharmacy">Pharmacy</option>
              </select>
              <input
                type="text"
                value={newPackageWeight}
                onChange={(e) => setNewPackageWeight(e.target.value)}
                placeholder="Weight (e.g. 2kg)"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              />
              <input
                type="number"
                min={0}
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="Fee (₦)"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm font-mono-tabular focus:border-[#FFC107] focus:outline-none"
              />
              <input
                type="number"
                min={0}
                value={newPackageValue}
                onChange={(e) => setNewPackageValue(e.target.value)}
                placeholder="Item Value (₦ opt)"
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm font-mono-tabular focus:border-[#FFC107] focus:outline-none"
              />
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value as PaymentMethod)}
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              >
                <option value="transfer">Bank Transfer</option>
                <option value="cod">Cash on Delivery</option>
                <option value="prepaid">Prepaid</option>
              </select>
              <select
                value={newPaymentStatus}
                onChange={(e) => setNewPaymentStatus(e.target.value as PaymentStatus)}
                className="rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2.5 text-sm focus:border-[#FFC107] focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsFragile}
                  onChange={(e) => setNewIsFragile(e.target.checked)}
                  className="accent-[#FFC107] w-4 h-4"
                />
                <span>Fragile handling required</span>
              </label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Dispatch instructions (optional)"
                className="flex-1 min-w-[200px] rounded-xl border border-neutral-300 dark:border-white/15 bg-neutral-50 dark:bg-[#0A0A0A] px-3 py-2 text-sm focus:border-[#FFC107] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-neutral-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-neutral-300 dark:border-white/15 px-4 py-2.5 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingDispatch}
                className="rounded-xl bg-[#FFC107] text-[#0A0A0A] px-5 py-2.5 text-xs font-extrabold hover:bg-[#F2B705] disabled:opacity-50 cursor-pointer"
              >
                {creatingDispatch ? 'Creating...' : 'Create Dispatch'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Order Detail & Live Edit Modal */}
      {inspectedOrder && (
        <div className="fixed inset-0 z-[1100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#12141a] p-6 shadow-2xl space-y-5 my-8 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 dark:border-white/10 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[#FFC107]">
                  Shipment Inspection
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-display text-3xl font-black">
                    #{inspectedOrder.orderId}
                  </h3>
                  <Link
                    to={`/track?id=${encodeURIComponent(inspectedOrder.orderId)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#FFC107] hover:underline"
                  >
                    <span>Open Customer View</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedOrderId(null)}
                aria-label="Close modal"
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <LiveTrackingMap
              theme={theme}
              riderPos={(() => {
                const pos = toValidLatLng(inspectedOrder.lat, inspectedOrder.lng);
                return pos
                  ? {
                      lat: pos.lat,
                      lng: pos.lng,
                      heading:
                        inspectedOrder.heading != null ? Number(inspectedOrder.heading) : null,
                      isMoving: inspectedOrder.isMoving ?? false,
                      speedKmh: inspectedOrder.speed
                        ? Math.round(inspectedOrder.speed * 3.6)
                        : 0,
                      label: inspectedOrder.riderName,
                    }
                  : null;
              })()}
              destPos={
                editDest
                  ? { lat: editDest.lat, lng: editDest.lng, address: editDest.address }
                  : (() => {
                      const dPos = toValidLatLng(inspectedOrder.destLat, inspectedOrder.destLng);
                      return dPos
                        ? { lat: dPos.lat, lng: dPos.lng, address: inspectedOrder.destAddress }
                        : null;
                    })()
              }
              startPos={toValidLatLng(inspectedOrder.startLat, inspectedOrder.startLng)}
              heightClass="h-[260px]"
            />

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-4 space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Parties &amp; Specs
                </div>
                <div>
                  <strong>Sender:</strong> {inspectedOrder.senderName || '—'} ({inspectedOrder.senderPhone || '—'})
                </div>
                {inspectedOrder.pickupAddress && (
                  <div>
                    <strong>Pickup:</strong> {inspectedOrder.pickupAddress}
                  </div>
                )}
                <div>
                  <strong>Receiver:</strong> {inspectedOrder.receiverName || '—'} ({inspectedOrder.receiverPhone || '—'})
                </div>
                <div>
                  <strong>Destination:</strong> {inspectedOrder.destAddress || '—'}
                </div>
                <div>
                  <strong>Package:</strong> {inspectedOrder.packageType || 'Parcel'}
                  {inspectedOrder.packageWeight ? ` · ${inspectedOrder.packageWeight}` : ''}
                  {inspectedOrder.isFragile ? ' (Fragile)' : ''}
                </div>
              </div>

              <div className="rounded-xl bg-neutral-50 dark:bg-[#181b24] p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Fee, Payment &amp; PIN
                </div>
                <div>
                  <strong>Fee:</strong>{' '}
                  <span className="font-mono-tabular font-bold text-[#FFC107]">
                    {formatNaira(inspectedOrder.fee)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <strong>Payment:</strong> {inspectedOrder.paymentMethod || 'transfer'} ·{' '}
                    <span
                      className={
                        inspectedOrder.paymentStatus === 'paid'
                          ? 'text-emerald-500 font-bold uppercase'
                          : 'text-amber-500 font-bold uppercase'
                      }
                    >
                      {inspectedOrder.paymentStatus || 'pending'}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={updatingOrder}
                    onClick={() => void handleTogglePayment(inspectedOrder)}
                    className="rounded-lg border border-neutral-300 dark:border-white/15 px-2.5 py-1 text-[11px] font-bold hover:border-[#FFC107] cursor-pointer"
                  >
                    Toggle Paid
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#FFC107]" />
                  <strong>Delivery PIN:</strong>{' '}
                  <span className="font-mono-tabular font-black text-[#FFC107]">
                    {inspectedOrder.deliveryCode || '----'}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  GPS Accuracy:{' '}
                  {inspectedOrder.accuracy != null ? `±${Math.round(inspectedOrder.accuracy)}m` : '—'}
                </div>
              </div>
            </div>

            {/* Reassign Rider / Update Destination */}
            <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#181b24] p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FFC107]">
                Reassign Rider or Update Drop-off
              </div>
              <div className="grid sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={editRiderName}
                  onChange={(e) => setEditRiderName(e.target.value)}
                  placeholder="Rider Name"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#0A0A0A] px-3 py-2 text-xs focus:border-[#FFC107] focus:outline-none"
                />
                <input
                  type="tel"
                  value={editRiderPhone}
                  onChange={(e) => setEditRiderPhone(e.target.value)}
                  placeholder="Rider Phone"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#0A0A0A] px-3 py-2 text-xs focus:border-[#FFC107] focus:outline-none"
                />
                <input
                  type="text"
                  value={editRiderBike}
                  onChange={(e) => setEditRiderBike(e.target.value)}
                  placeholder="Bike Plate"
                  className="rounded-xl border border-neutral-300 dark:border-white/15 bg-white dark:bg-[#0A0A0A] px-3 py-2 text-xs uppercase font-mono-tabular focus:border-[#FFC107] focus:outline-none"
                />
              </div>

              <DestinationSearch
                value={editDestText}
                onChangeText={setEditDestText}
                onSelectDestination={(d) => setEditDest(d)}
                pinnedCoords={
                  editDest
                    ? { lat: editDest.lat, lng: editDest.lng }
                    : toValidLatLng(inspectedOrder.destLat, inspectedOrder.destLng)
                }
              />

              <button
                type="button"
                disabled={updatingOrder}
                onClick={() => void handleSaveInspectionEdits()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{updatingOrder ? 'Saving...' : 'Save Rider / Destination Updates'}</span>
              </button>
            </div>

            {inspectedOrder.status !== 'delivered' && inspectedOrder.status !== 'cancelled' && (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-neutral-200 dark:border-white/10">
                <button
                  type="button"
                  disabled={updatingOrder}
                  onClick={() => void handleAdminOrderStatus(inspectedOrder, 'cancelled')}
                  className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-500 px-4 py-2.5 text-xs font-bold hover:bg-red-500/20 disabled:opacity-50 cursor-pointer"
                >
                  Cancel Shipment
                </button>
                <button
                  type="button"
                  disabled={updatingOrder}
                  onClick={() => void handleAdminOrderStatus(inspectedOrder, 'delivered')}
                  className="rounded-xl bg-[#FFC107] text-[#0A0A0A] px-5 py-2.5 text-xs font-extrabold hover:bg-[#F2B705] disabled:opacity-50 cursor-pointer"
                >
                  Force Mark Delivered
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
