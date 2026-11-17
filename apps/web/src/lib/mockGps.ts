import { getSocket } from './socket';
import { fetchDrivingRoute, type Coords } from '../services/routingService';

export class MockGPS {
  private intervalId: number | null = null;
  private currentIdx = 0;
  private routePoints: Coords[] = [];
  private rideId: string;
  private start: Coords;
  private end: Coords;

  constructor(rideId: string, start: Coords, end: Coords, initialRoadPoints?: [number, number][]) {
    this.rideId = rideId;
    this.start = start;
    this.end = end;

    if (initialRoadPoints && initialRoadPoints.length > 0) {
      // initialRoadPoints are [lng, lat] from GeoJSON
      this.routePoints = initialRoadPoints.map(([lng, lat]) => ({ lat, lng }));
    }
  }

  public async startSimulation(updateIntervalMs: number = 1500) {
    if (this.intervalId) return;

    // If real road points not yet populated, fetch real road geometry from OSRM
    if (this.routePoints.length === 0) {
      try {
        const routeResult = await fetchDrivingRoute(this.start, this.end);
        this.routePoints = routeResult.coordinates.map(([lng, lat]) => ({ lat, lng }));
      } catch (_e) {
        // Fallback to start and end
        this.routePoints = [this.start, this.end];
      }
    }

    // Ensure we have a reasonable number of step intervals (e.g. 25-40 steps) along the road
    const targetSteps = 30;
    const sampledRoute: Coords[] = [];
    if (this.routePoints.length <= targetSteps) {
      // Subdivide segments along the road points
      for (let i = 0; i < this.routePoints.length - 1; i++) {
        const p1 = this.routePoints[i];
        const p2 = this.routePoints[i + 1];
        const subSteps = Math.max(1, Math.floor(targetSteps / (this.routePoints.length - 1)));
        for (let s = 0; s < subSteps; s++) {
          sampledRoute.push({
            lat: p1.lat + ((p2.lat - p1.lat) * s) / subSteps,
            lng: p1.lng + ((p2.lng - p1.lng) * s) / subSteps,
          });
        }
      }
      sampledRoute.push(this.routePoints[this.routePoints.length - 1]);
    } else {
      // Sample existing high-density road geometry points
      const stepInterval = (this.routePoints.length - 1) / targetSteps;
      for (let i = 0; i < targetSteps; i++) {
        const index = Math.min(this.routePoints.length - 1, Math.round(i * stepInterval));
        sampledRoute.push(this.routePoints[index]);
      }
      sampledRoute.push(this.routePoints[this.routePoints.length - 1]);
    }

    this.routePoints = sampledRoute;
    this.currentIdx = 0;

    this.intervalId = window.setInterval(() => {
      if (this.currentIdx >= this.routePoints.length) {
        this.stopSimulation();
        return;
      }

      const point = this.routePoints[this.currentIdx];
      const socket = getSocket();

      socket.emit('ride:location', {
        rideId: this.rideId,
        latitude: point.lat,
        longitude: point.lng,
        timestamp: Date.now(),
      });

      this.currentIdx++;
    }, updateIntervalMs);
  }

  public stopSimulation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public isRunning(): boolean {
    return this.intervalId !== null;
  }
}
