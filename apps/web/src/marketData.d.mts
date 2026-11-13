export type MarketPoint = { timestamp: string; value: number; eventId?: string };
export type MarketPeriod = 'week' | 'fortnight' | 'all';
export type MarketEvent = {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  referenceId?: string;
};
export const PERIODS: Readonly<Record<MarketPeriod, { label: string; days: number | null }>>;
export function toUtcTime(value: string): number;
export function sortPoints(points: MarketPoint[]): MarketPoint[];
export function pointsForPeriod(points: MarketPoint[], period: MarketPeriod): MarketPoint[];
export function summarizePeriod(points: MarketPoint[]): {
  kind: string;
  change: number | null;
  direction: string;
};
export function isOutdated(asOf: string | undefined, currentTime?: number, hours?: number): boolean;
export function eventsInPeriod(items: MarketEvent[], points: MarketPoint[]): MarketEvent[];
