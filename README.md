# RideFlow

Real-time rides. Right where you need them.

RideFlow is a production-quality, real-time ride-hailing platform built with a modern stack. It features a robust modular monolith architecture, real-time driver tracking via WebSockets, and geospatial queries using PostGIS.

## Current Status (Phase 1)
Currently establishing the development foundation. Basic infrastructure, monorepo setup, standard UI design system, minimal API health checks, and database connectivity are in place. **Advanced features like real-time ride tracking, authentication, and driver matching are planned for later phases.**

## Repository Structure

The project utilizes an npm workspaces monorepo:

```
rideflow/
├── apps/
│   ├── web/        (Frontend: React, Vite, Tailwind CSS)
│   └── server/     (Backend: Node.js, Express)
├── packages/
│   └── shared/     (Shared TypeScript types and constants)
├── prisma/         (Database schemas and migrations)
```

## Technology Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with PostGIS
- **ORM:** Prisma
- **Tooling:** ESLint, Prettier, Docker Compose

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- Git

## Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Infrastructure (PostgreSQL/PostGIS)

Start the database using Docker Compose:
```bash
docker-compose up -d
```
This will start a PostgreSQL instance with the PostGIS extension enabled on port 5432.

## Running the Application

### Backend
1. Generate Prisma client (if applicable): `npx prisma generate`
2. Start the API in dev mode:
   ```bash
   npm run dev --workspace=apps/server
   ```
3. Test the health endpoint: `GET http://localhost:4000/api/health`

### Frontend
1. Start the Vite dev server:
   ```bash
   npm run dev --workspace=apps/web
   ```
2. Open `http://localhost:5173` in your browser.

## Development Roadmap
- **Phase 1:** Project Foundation (Current)
- **Phase 2:** Core MVP Flow & Auth
- **Phase 3:** Real-time Tracking (Socket.IO)
- **Phase 4:** Trip Completion & Fare Calculation
- **Phase 5+:** Admin Dashboard, Optimizations
