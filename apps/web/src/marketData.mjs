/** Pure helpers used by the offline market visualisation; no live market API. */
export const PERIODS = Object.freeze({
  week: { label: '7 dias', days: 7 },
  fortnight: { label: '14 dias', days: 14 },
  all: { label: 'Tudo', days: null },
});

const DAY_MS = 86_400_000;

export function toUtcTime(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.NaN;
}

export function sortPoints(points) {
  return [...points]
    .filter((point) =>
      Number.isFinite(point.value) && Number.isFinite(toUtcTime(point.timestamp)),
    )
    .sort((a, b) => toUtcTime(a.timestamp) - toUtcTime(b.timestamp));
}

export function pointsForPeriod(points, period) {
  const sorted = sortPoints(points);
  const last = sorted.at(-1);
  if (!last) return [];
  const days = PERIODS[period]?.days ?? null;
  if (days === null) return sorted;
  const start = toUtcTime(last.timestamp) - (days - 1) * DAY_MS;
  return sorted.filter((point) => toUtcTime(point.timestamp) >= start);
}

export function summarizePeriod(points) {
  if (points.length === 0) {
    return { kind: 'empty', change: null, direction: 'indisponível' };
  }
  if (points.length === 1) {
    return { kind: 'single', change: null, direction: 'insuficiente' };
  }
  const start = points[0].value;
  const end = points.at(-1).value;
  if (start === 0) {
    return { kind: 'zero-base', change: null, direction: 'indefinida' };
  }
  const change = ((end - start) / Math.abs(start)) * 100;
  return {
    kind: 'normal',
    change,
    direction: change > 0 ? 'alta' : change < 0 ? 'queda' : 'estabilidade',
  };
}

export function isOutdated(asOf, currentTime = Date.now(), hours = 24) {
  const time = toUtcTime(asOf);
  return !Number.isFinite(time) || currentTime - time > hours * 60 * 60 * 1000;
}

export function eventsInPeriod(items, points) {
  if (!points.length) return [];
  const start = toUtcTime(points[0].timestamp);
  const end = toUtcTime(points.at(-1).timestamp);
  return items.filter((item) => {
    const time = toUtcTime(item.publishedAt);
    return Number.isFinite(time) && time >= start && time <= end;
  });
}
