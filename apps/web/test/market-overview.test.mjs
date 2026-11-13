import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  eventsInPeriod,
  isOutdated,
  pointsForPeriod,
  summarizePeriod,
} from '../src/marketData.mjs';
import { validateSceneDocument } from '../../../packages/contracts/index.mjs';

const market = JSON.parse(
  await readFile(
    new URL(
      '../../../packages/contracts/fixtures/market-overview.json',
      import.meta.url,
    ),
  ),
);
const series = market.components.find((item) => item.type === 'time_series');
const news = market.components.find((item) => item.type === 'news_panel');

test('market fixture is valid and explicitly marked synthetic', () => {
  assert.equal(validateSceneDocument(market).valid, true);
  assert.equal(series.dataStatus, 'demo');
  assert.equal(news.dataStatus, 'demo');
  assert.ok(series.title.toLowerCase().includes('sintético'));
  assert.ok(news.items.every((event) => event.source.includes('sintética')));
  assert.ok(market.references.every((item) => item.url.startsWith('https://')));
});

test('period buttons produce deterministic bounded windows', () => {
  assert.equal(pointsForPeriod(series.points, 'all').length, 21);
  assert.equal(pointsForPeriod(series.points, 'week').length, 7);
  assert.equal(pointsForPeriod(series.points, 'fortnight').length, 14);
  assert.equal(
    pointsForPeriod(series.points, 'week')[0].timestamp,
    '2024-05-15T17:00:00Z',
  );
});

test('changing the range changes contextual percent performance', () => {
  const week = summarizePeriod(pointsForPeriod(series.points, 'week'));
  const all = summarizePeriod(pointsForPeriod(series.points, 'all'));
  assert.equal(week.kind, 'normal');
  assert.equal(all.kind, 'normal');
  assert.notEqual(week.change, all.change);
  assert.ok(all.change > 0);
  assert.equal(summarizePeriod([]).kind, 'empty');
  assert.equal(
    summarizePeriod([{ timestamp: '2024-05-21T17:00:00Z', value: 0 }]).kind,
    'single',
  );
  assert.equal(
    summarizePeriod([
      { timestamp: '2024-05-01T17:00:00Z', value: 0 },
      { timestamp: '2024-05-02T17:00:00Z', value: 4 },
    ]).kind,
    'zero-base',
  );
});

test('selected timeline events follow the chosen period', () => {
  const week = eventsInPeriod(
    news.items,
    pointsForPeriod(series.points, 'week'),
  );
  const all = eventsInPeriod(news.items, pointsForPeriod(series.points, 'all'));
  assert.deepEqual(
    week.map((item) => item.id),
    ['event_c', 'event_d'],
  );
  assert.equal(all.length, 4);
  assert.deepEqual(eventsInPeriod(news.items, []), []);
});

test('verified stale or missing timestamps are treated as outdated', () => {
  assert.equal(
    isOutdated('2024-05-21T17:00:00Z', Date.parse('2024-05-22T18:00:00Z')),
    true,
  );
  assert.equal(
    isOutdated('2024-05-21T17:00:00Z', Date.parse('2024-05-22T16:00:00Z')),
    false,
  );
  assert.equal(isOutdated(undefined), true);
});
