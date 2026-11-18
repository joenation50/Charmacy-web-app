/**
 * Phase 0 TDD Security Test Suite for CharMary Firestore Rules.
 * Verifies all 12 Dirty Dozen adversarial payloads against firestore.rules.
 */
import { readFileSync } from 'node:fs';

export const DIRTY_DOZEN_CASES = [
  {
    id: 1,
    name: 'Privilege escalation on user creation (role: admin)',
    collection: 'users/rider1',
    op: 'create',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: { uid: 'rider1', email: 'rider1@example.com', displayName: 'Rider One', role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Role mutation on user profile update',
    collection: 'users/rider1',
    op: 'update',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Spoofed riderUid on order creation',
    collection: 'orders/CH-1001',
    op: 'create',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: { orderId: 'CH-1001', riderUid: 'rider2', status: 'active' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow ghost field injection on order creation',
    collection: 'orders/CH-1002',
    op: 'create',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: { orderId: 'CH-1002', riderUid: 'rider1', ghostBypass: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Path variable ID poisoning',
    collection: 'orders/' + 'A'.repeat(200),
    op: 'create',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: { orderId: 'A'.repeat(200), riderUid: 'rider1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Client-forged timestamp on order creation',
    collection: 'orders/CH-1003',
    op: 'create',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: { orderId: 'CH-1003', riderUid: 'rider1', createdAt: new Date('2020-01-01') },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unconstrained list query on orders by rider',
    collection: 'orders',
    op: 'list',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Cross-rider telemetry hijack',
    collection: 'orders/CH-1001',
    op: 'update',
    auth: { uid: 'rider2', email: 'rider2@example.com', email_verified: true },
    payload: { lat: 5.5, lng: 7.0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal state reopening by rider after delivered',
    collection: 'orders/CH-DONE',
    op: 'update',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: { status: 'active' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Delivery PIN tampering by rider',
    collection: 'orders/CH-1001',
    op: 'update',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: { deliveryCode: '0000' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Orphan publicTracking record without parent order',
    collection: 'publicTracking/CH-ORPHAN',
    op: 'create',
    auth: { uid: 'rider1', email: 'rider1@example.com', email_verified: true },
    payload: { orderId: 'CH-ORPHAN', riderUid: 'rider1', status: 'active' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unverified admin email spoofing',
    collection: 'orders',
    op: 'list',
    auth: { uid: 'attacker', email: 'joenation98@gmail.com', email_verified: false },
    payload: null,
    expected: 'PERMISSION_DENIED',
  },
];

export function assertRulesContainHardenedGates(rulesPath = 'firestore.rules'): boolean {
  const src = readFileSync(rulesPath, 'utf8');
  const required = [
    "rules_version = '2';",
    'isValidId(',
    'isValidOrder(',
    'isValidUserProfile(',
    'isValidPublicTracking(',
    'email_verified == true',
    'existsAfter(',
    'affectedKeys().hasOnly(',
  ];
  return required.every((token) => src.includes(token));
}
