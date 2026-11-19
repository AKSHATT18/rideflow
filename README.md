# RideFlow

A production-quality, real-time ride-hailing platform built with a modern stack.

## Architecture

- **Monorepo:** npm workspaces
- **Frontend:** React, Vite, Tailwind CSS v3, Zustand, React Router, React Hook Form
- **Backend:** Node.js, Express, Prisma, Zod, JWT
- **Database:** PostgreSQL + PostGIS (via Docker)
- **Maps:** Google Maps Platform

## Environment Setup

### 1. Database Configuration
RideFlow uses a Dockerized PostGIS database. Ensure Docker is running.
```bash
# Start the database (exposed on localhost:5433 to prevent conflicts)
docker-compose up -d

# Push the database schema
npx prisma db push
```

### 2. Google Maps API Configuration
The Passenger application requires a valid Google Maps API Key to render maps, search locations, and calculate routes.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable the following APIs:
   - **Maps JavaScript API** (For rendering the map)
   - **Places API** (For location autocomplete)
   - **Directions API** (For route calculation)
   - **Geocoding API** (For translating coordinates)
4. Create an API Key in *APIs & Services > Credentials*.
5. **Restrict your API key** to the specific APIs listed above, and restrict HTTP referrers to your development and production domains (e.g., `http://localhost:5173`).
6. Copy `.env.example` to `.env` in the root of the project and add your API key:

```env
VITE_GOOGLE_MAPS_API_KEY="your_actual_api_key_here"
```
*(If the key is missing, the application will display a polished setup state instructing the user to add it, preventing a broken UI).*

## Running the Application

Start the backend and frontend development servers concurrently:

```bash
# Start the backend API (http://localhost:4000)
npm run dev --workspace=apps/server

# Start the frontend UI (http://localhost:5173)
npm run dev --workspace=apps/web
```

## Available Scripts (Root)

- `npm run build --workspaces` - Builds all packages in the monorepo.
- `npm run dev --workspace=apps/web` - Starts frontend development server.
- `npm run dev --workspace=apps/server` - Starts backend development server.

## Phases
- **Phase 1:** Project Foundation & Infrastructure
- **Phase 2:** Authentication, Roles, & Security
- **Phase 3:** Maps, Geolocation & Passenger UI
- **Phase 4:** Real-time Socket.IO, Driver Ride Execution, & Mock GPS
- **Phase 5:** (Upcoming) Microservices, Redis Scaling, Payment Gateway
