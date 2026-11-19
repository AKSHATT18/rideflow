# RideFlow Real-Time Architecture

RideFlow uses a strictly authorized Socket.IO architecture for real-time location streaming and state changes.

## Architecture Flow

Mock GPS (Frontend)
        ↓
Driver Client (React/Socket.IO-client)
        ↓ (event: `ride:location`)
RideFlow Backend (Express + Socket.IO Server)
        ↓ (validation + authorization)
Authorized `ride:{rideId}` room
        ↓ (event: `ride:location`)
Passenger Client
        ↓ (Zustand state update)
Passenger Map (Google Maps Marker)

## Authentication & Authorization

- **Handshake**: The Socket.IO connection requires `withCredentials: true`. The backend uses the `cookie` module to extract the `jwt` token and authenticates the user exactly like REST endpoints. Tokens are *never* stored in `localStorage`.
- **Ride Rooms**: Before joining a `ride:{id}` room, the server checks the database to verify that the socket's user is either the `passengerId` or the `driverId` for that specific ride. Unauthorized requests are rejected.

## Mock GPS Simulation

For development and demonstration without a physical device, the GPS is simulated *on the frontend* Driver client.
- When the driver clicks "[Dev] Start GPS Simulator", the `MockGPS` class interpolates coordinates from pickup to destination.
- It fires actual `ride:location` events over the socket network.
- **Why this design?** This ensures the backend and passenger clients receive data through the exact same socket pipeline as real GPS hardware would use in production.

## Why Not Persist GPS to PostgreSQL?

GPS updates occur at high frequencies (e.g., every 1-2 seconds). Writing every point to PostgreSQL would create a massive write load and bloat the database rapidly. 
Instead:
- The backend treats locations as **transient real-time data**, broadcasting it directly to the socket room.
- In a future phase, we may batch updates or persist only the latest known location via an optimized store like Redis.
