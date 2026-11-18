# Security Specification — CharMary Real-Time Delivery & Tracking

## 1. Data Invariants

1. **Identity & Role Integrity**: No user may self-assign `role: "admin"` when creating or updating `/users/{userId}`. Only existing admins (or the bootstrapped project owner `joenation98@gmail.com` with verified email) can read/write `/admins/{userId}` or alter another user's role.
2. **PII Isolation**: Private contact details (`senderPhone`, `receiverPhone`, `riderPhone`, `destAddress`, `deliveryCode`, `email`) live exclusively in `/users/{userId}` and `/orders/{orderId}`, never in `/publicTracking/{orderId}`.
3. **Order Ownership & Immutable Provenance**: An order's `orderId`, `riderUid`, `deliveryCode`, and `createdAt` cannot be modified by a rider after creation.
4. **Terminal State Locking**: Once an order reaches `status: "delivered"` or `status: "cancelled"`, no non-admin user may reopen or mutate the order or its `/publicTracking/{orderId}` mirror.
5. **Monotonic Telemetry & Server Timestamps**: `createdAt` and `lastUpdated` must equal `request.time`. Telemetry `sequence` must never decrease.
6. **Master Gate on Subcollections**: `/orders/{orderId}/events/{eventId}` verifies parent `/orders/{orderId}` ownership or admin status via `get()`.
7. **No Blanket List Enumeration**: `/users`, `/orders`, and `/publicTracking` reject unauthenticated or unconstrained `list` queries (`publicTracking` disables `list` completely; `orders` enforces `resource.data.riderUid == request.auth.uid` for riders).

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Privilege Escalation on Signup**: `POST /users/{uid}` with `{ uid, email, displayName, role: "admin" }` by a regular user -> **PERMISSION_DENIED**.
2. **Role Mutation on Profile Update**: `PATCH /users/{uid}` changing `role` from `"rider"` to `"admin"` -> **PERMISSION_DENIED**.
3. **Spoofed Rider UID on Order Creation**: `POST /orders/CH-1001` with `riderUid: "other-rider-uid"` by non-admin -> **PERMISSION_DENIED**.
4. **Shadow / Ghost Field Injection**: `POST /orders/CH-1001` including an undeclared field `{ ..., isVerifiedAdmin: true }` -> **PERMISSION_DENIED**.
5. **ID Poisoning**: `POST /orders/../../etc/passwd` or 300-character ID -> **PERMISSION_DENIED**.
6. **Client Timestamp Forgery**: `POST /orders/CH-1001` with `createdAt` set to a past client `Date` instead of `request.time` -> **PERMISSION_DENIED**.
7. **PII Scraping via List**: `list /orders` by a rider without `where('riderUid', '==', auth.uid)` -> **PERMISSION_DENIED**.
8. **Cross-Rider Hijack**: Rider B attempting `PATCH /orders/CH-1001` owned by Rider A -> **PERMISSION_DENIED**.
9. **Terminal State Reopening**: Rider attempting to update `status: "active"` on an order whose `status` is already `"delivered"` -> **PERMISSION_DENIED**.
10. **Delivery PIN Tampering**: Rider attempting to overwrite `deliveryCode` during delivery confirmation -> **PERMISSION_DENIED**.
11. **Orphan Public Tracking Creation**: Creating `/publicTracking/CH-9999` without an accompanying `/orders/CH-9999` document -> **PERMISSION_DENIED**.
12. **Unverified / Spoofed Admin Email**: User with `email: "joenation98@gmail.com"` and `email_verified: false` attempting `list /orders` -> **PERMISSION_DENIED**.
