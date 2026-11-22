# RideFlow Phase 5.3 Audit Report
## Driver Experience, Navigation & Earnings

### 1. Existing Driver Features
- **Authentication & Role**: Drivers register and log in with JWT tokens stored in HTTP-only cookies; role `'DRIVER'` is verified by Express middleware `requireRole('DRIVER')`.
- **Driver Status Toggle**: Simple status endpoint `POST /api/driver/status` updates `DriverProfile.status` between `ONLINE` and `OFFLINE`.
- **Pending Rides Feed**: Drivers poll `GET /api/rides/pending` every 4 seconds when online and idle to view ride requests.
- **Atomic Acceptance**: Drivers accept rides via `POST /api/rides/:id/accept`, executed inside a Prisma transaction that verifies `ONLINE` status, checks for ongoing rides, and updates `Ride.status` from `SEARCHING` to `DRIVER_ASSIGNED`.
- **Arrival Marking**: Drivers mark arrival via `POST /api/rides/:id/arrive`, moving ride status to `DRIVER_ARRIVED`.
- **OTP Verification & Trip Start**: When `DRIVER_ARRIVED`, drivers must enter the passenger's 4-digit PIN via `POST /api/rides/:id/verify-otp`, atomically transitioning the ride to `IN_PROGRESS`. Direct `startTrip` without OTP is blocked.
- **Trip Completion**: Drivers complete trips via `POST /api/rides/:id/complete`, transitioning to `COMPLETED` and setting `driverProfile.status = 'ONLINE'`.
- **GPS Simulation**: Drivers can run `MockGPS` which polls road waypoints and emits `ride:location` via Socket.IO.

---

### 2. Existing Database Models & Fields (`prisma/schema.prisma`)
- **`User`**:
  - `id`, `email`, `phone`, `firstName`, `lastName`, `passwordHash`, `role` (`PASSENGER`, `DRIVER`, `ADMIN`), `status` (`ACTIVE`, `SUSPENDED`), `avatarUrl`, timestamps.
  - Relations: `driverProfile`, `passengerRides`, `driverRides`, `ratingsGiven`, `ratingsReceived`.
- **`DriverProfile`**:
  - `id`, `userId` (1-to-1 with User), `licenseNumber`, `vehicleMake`, `vehicleModel`, `vehiclePlate`, `vehicleYear`, `vehicleColor`.
  - `isVerified` (Boolean, default: `false`).
  - `rating` (Float, default: `5.0`), `ratingCount` (Int, default: 0), `totalTrips` (Int, default: 0).
  - `status` (`DriverStatus`: `OFFLINE`, `ONLINE`, `BUSY`).
- **`Ride`**:
  - `id`, `passengerId`, `driverId`, `pickupLat`, `pickupLng`, `pickupAddress`, `destinationLat`, `destinationLng`, `destinationAddress`.
  - `vehicleType`, `estimatedDistanceKm`, `estimatedDurationMin`, `estimatedFare`, `finalFare`.
  - `status` (`REQUESTED`, `SEARCHING`, `DRIVER_ASSIGNED`, `DRIVER_ARRIVING`, `DRIVER_ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
  - `requestedAt`, `acceptedAt`, `startedAt`, `completedAt`, `cancelledAt`.
- **`Rating`**:
  - `rideId` (unique), `passengerId`, `driverId`, `score` (1-5), `comment`, `tags`, `createdAt`.
- **`RideOTP`**:
  - `rideId`, `otpHash` (HMAC-SHA256 salted), `encryptedOtp` (AES-256-GCM), `attempts`, `maxAttempts`, `verifiedAt`, `expiresAt`.

---

### 3. Existing API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `POST /api/driver/status`: basic toggle of driver status.
- `GET /api/rides/pending`: returns active `SEARCHING` rides with passenger info.
- `GET /api/rides/active`: returns active ride for the authenticated user.
- `GET /api/rides/my-rides`: basic ride list (up to 50 items).
- `GET /api/rides/:id`: retrieves specific ride details.
- `POST /api/rides/:id/accept`: atomic driver acceptance with OTP generation.
- `POST /api/rides/:id/arrive`: marks `DRIVER_ARRIVED`.
- `POST /api/rides/:id/start`: rejects if OTP unverified; starts trip if verified.
- `POST /api/rides/:id/complete`: completes trip and calculates final fare.
- `POST /api/rides/:id/cancel`: cancels ride if in pre-trip state.
- `GET /api/rides/:id/otp`: passenger-only OTP retrieval.
- `POST /api/rides/:id/verify-otp`: driver OTP verification.

---

### 4. Existing Socket Events
- Client emit `ride:join` with `rideId`: server verifies role and joins room `ride:${rideId}`.
- Client emit `ride:leave` with `rideId`.
- Client emit `ride:location` with `{ rideId, latitude, longitude, timestamp }`: verified and broadcast to `ride:${rideId}`.
- Server emit `ride:status` with `{ status, ride }`.
- Server emit `ride:pickup_verified` with `{ rideId, status, verifiedAt }`.
- Server emit `driver:available` with `{ ride }` (to `driver:available` room).

---

### 5. Existing Map and Navigation Implementation
- **Provider**: OpenFreeMap Liberty style vector tiles via MapLibre GL JS (`OPENFREEMAP_LIBERTY_STYLE`).
- **Routing Engine**: OSRM public API (`https://router.project-osrm.org/route/v1/driving/...`) in `routingService.ts` returning real GeoJSON geometry, distance (km), and travel duration (min).
- **Current Driver Experience**: Map is currently only embedded on the Passenger Dashboard (`RideMap.tsx`). The Driver Dashboard is currently text/card-only with no visual map or turn/route navigation overview.

---

### 6. Missing Functionality to Implement (Phase 5.3)
1. **Driver Profile & Vehicle Management (Milestone 5.3.1)**:
   - Backend `GET /api/driver/profile` returning profile, vehicle info, ratings, and stats.
   - Backend `PUT /api/driver/profile` validating and updating permitted fields (license, make, model, year, color, plate, vehicle category). Enforces unique plates and prevents editing protected fields (`rating`, `totalTrips`, `isVerified`, `role`).
   - Frontend Driver Profile modal/card with editing, vehicle badges, and verification status indicator.
2. **Robust Driver Availability (Milestone 5.3.2)**:
   - Backend `PUT /api/driver/availability` or `POST /api/driver/status` enhanced to:
     - Block going offline while in an active trip (`DRIVER_ASSIGNED`, `DRIVER_ARRIVED`, `IN_PROGRESS`).
     - Block unverified or suspended drivers from accepting rides or going online.
     - Prevent multiple concurrent active rides.
     - Automatically synchronize status on trip completion or cancellation.
   - Real-time notification when driver availability updates.
3. **Driver Navigation Experience (Milestone 5.3.3)**:
   - Visual MapLibre map on Driver Dashboard during active rides:
     - Phase A (Before pickup): OSRM route from driver's location to passenger pickup, showing distance and ETA.
     - Phase B (After OTP verification / `IN_PROGRESS`): automatically recalculates and switches OSRM route from pickup to passenger destination.
   - Navigation HUD: destination label, remaining distance, ETA, recenter button, and route polyline.
   - GPS simulator or location streamer seamlessly drives marker along the active navigation route.
4. **Driver Earnings Dashboard (Milestone 5.3.4)**:
   - Explicit driver payout formula: 80% driver payout, 20% platform commission (e.g. `driverEarnings = Math.round(finalFare * 0.80 * 100) / 100`).
   - Backend `GET /api/driver/earnings`: aggregates lifetime earnings, today's earnings, this week's earnings, this month's earnings, total completed trips, and daily breakdown for the last 7 days.
   - Cancelled rides excluded from earnings.
   - Frontend Driver Earnings Dashboard: responsive summary cards, daily earnings bar chart (lightweight SVG/CSS), and recent trips breakdown.
5. **Driver Trip History (Milestone 5.3.5)**:
   - Backend `GET /api/driver/trips`: paginated history with status filter (`ALL`, `COMPLETED`, `CANCELLED`), date range filters, passenger details limited to authorized fields, and driver earnings.
   - Frontend Driver Trip History modal or view with filters, pagination, and status pills.

---

### 7. Files Likely to Be Created or Modified
- `prisma/schema.prisma`: Add `vehicleCategory` to `DriverProfile`, default `isVerified = true` for dev/test safety, plate uniqueness validation.
- `apps/server/src/services/driverService.ts`: New driver domain service for profile, availability, earnings aggregation, and trip history.
- `apps/server/src/controllers/driverController.ts`: Extend with profile, availability, earnings, and trips handlers.
- `apps/server/src/routes/driver.ts`: Register `GET /profile`, `PUT /profile`, `POST /status`, `GET /earnings`, `GET /trips`.
- `apps/server/src/services/rideService.ts`: Enforce verification/suspension checks in `acceptRide` and ensure status sync on cancellation.
- `apps/server/src/tests/driverExperience.test.ts`: New comprehensive test suite for Driver Profile, Availability, Earnings, and Trip History.
- `apps/web/src/components/driver/`:
  - `DriverProfileModal.tsx`: Driver and vehicle management modal.
  - `DriverNavigationMap.tsx`: Active navigation map with dual-phase OSRM routing (to pickup, then to dropoff).
  - `DriverEarningsModal.tsx`: Financial summary cards and 7-day earnings chart.
  - `DriverTripHistoryModal.tsx`: Paginated trip history with filters.
- `apps/web/src/pages/DriverDashboard.tsx`: Integrate top navigation bar, modals, and embedded navigation map.

---

### 8. Risks and Dependencies
- **OSRM Public API Rate Limits**: Public OSRM server handles moderate demo requests; cache routes by coordinates or abort gracefully if unreachable.
- **Coordinate Formats**: MapLibre and GeoJSON require `[longitude, latitude]`; OSRM URL uses `lng,lat;lng,lat`; Prisma/DB stores `pickupLat`, `pickupLng`. Careful ordering is required.
- **Financial Precision**: Floating point inaccuracies avoided by rounding earnings to 2 decimal places using deterministic server-authoritative calculations.
- **Regression Safety**: All 48 existing backend tests and 10 web tests must continue to pass throughout all sub-phases.
