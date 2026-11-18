export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export type OrderStatus = 'active' | 'delivered' | 'cancelled';

export type TrackingState =
  | 'starting'
  | 'live'
  | 'stopped'
  | 'offline'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'transfer' | 'cod' | 'prepaid';
export type PaymentStatus = 'pending' | 'paid';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'rider' | 'admin';
  phone?: string;
  bikePlate?: string;
  isOnline?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DeliveryOrder {
  orderId: string;
  riderUid: string;
  riderName: string;
  riderPhone: string;
  riderBike: string;
  senderName: string;
  senderPhone: string;
  pickupAddress?: string;
  receiverName: string;
  receiverPhone: string;
  packageType: string;
  packageWeight?: string;
  packageValue?: number | null;
  isFragile?: boolean;
  packageNote?: string;
  priority: 'standard' | 'express';
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  fee: number;
  destAddress: string;
  destPlaceId?: string;
  destLat: number;
  destLng: number;
  startLat: number | null;
  startLng: number | null;
  deliveryCode: string;
  status: OrderStatus;
  trackingState: TrackingState;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  isMoving?: boolean;
  routeDistanceMeters?: number | null;
  routeDurationSeconds?: number | null;
  sequence: number;
  locationAt: number | null;
  heartbeatAt?: unknown;
  createdAt?: unknown;
  lastUpdated?: unknown;
  deliveredAt?: unknown;
}

export interface PublicTrackingSnapshot {
  orderId: string;
  riderUid: string;
  riderDisplayName: string;
  riderBike: string;
  packageType: string;
  priority: 'standard' | 'express';
  destLabel: string;
  destLat: number;
  destLng: number;
  startLat: number;
  startLng: number;
  status: OrderStatus;
  trackingState: TrackingState;
  lat: number | null;
  lng: number | null;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  isMoving?: boolean;
  routeDistanceMeters?: number | null;
  routeDurationSeconds?: number | null;
  sequence: number;
  locationAt: number | null;
  lastUpdated?: unknown;
  deliveredAt?: unknown;
}

export type OrderEventType =
  | 'created'
  | 'moving'
  | 'stopped'
  | 'destination_updated'
  | 'offline_synced'
  | 'delivered'
  | 'cancelled';

export interface OrderEvent {
  eventId: string;
  type: OrderEventType;
  message: string;
  lat?: number | null;
  lng?: number | null;
  actorUid: string;
  createdAt?: unknown;
}

export interface DestinationSelection {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}
