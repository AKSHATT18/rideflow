import { describe, it, expect } from 'vitest';

export const DRIVER_COMMISSION_RATE = 0.8; // 80% to driver, 20% to platform

export const calculateDriverPayout = (fare: number): number => {
  return Math.round(fare * DRIVER_COMMISSION_RATE * 100) / 100;
};

export const calculatePlatformCommission = (fare: number): number => {
  return Math.round((fare - calculateDriverPayout(fare)) * 100) / 100;
};

export const calculateChartBarHeightPercent = (dayEarnings: number, maxWeekEarnings: number): number => {
  if (maxWeekEarnings <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((dayEarnings / maxWeekEarnings) * 100)));
};

describe('Phase 5.3 Frontend Driver Earnings Calculations', () => {
  it('correctly splits fares into 80% driver payout and 20% platform commission', () => {
    expect(calculateDriverPayout(500)).toBe(400);
    expect(calculatePlatformCommission(500)).toBe(100);

    expect(calculateDriverPayout(350)).toBe(280);
    expect(calculatePlatformCommission(350)).toBe(70);

    expect(calculateDriverPayout(125.5)).toBe(100.4);
    expect(calculatePlatformCommission(125.5)).toBe(25.1);
  });

  it('prevents floating-point rounding anomalies across typical ride fares', () => {
    const fares = [100, 246, 389.75, 450, 680, 1200];
    fares.forEach((fare) => {
      const driver = calculateDriverPayout(fare);
      const platform = calculatePlatformCommission(fare);
      expect(Math.round((driver + platform) * 100) / 100).toBe(fare);
    });
  });

  it('calculates chart bar height percentages accurately', () => {
    expect(calculateChartBarHeightPercent(200, 400)).toBe(50);
    expect(calculateChartBarHeightPercent(400, 400)).toBe(100);
    expect(calculateChartBarHeightPercent(0, 400)).toBe(0);
    expect(calculateChartBarHeightPercent(500, 0)).toBe(0);
  });
});
