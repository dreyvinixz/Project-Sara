import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('TEMPORARY: export Biome-formatted files for applying source changes', () => {
  const paths = [
    'apps/web/src/SceneRenderer.tsx',
    'apps/web/src/MarketOverview.tsx',
    'apps/web/src/market-overview.css',
    'apps/web/src/marketData.mjs',
    'apps/web/test/market-overview.test.mjs',
  ];
  const run = spawnSync('npm', ['exec', '--', 'biome', 'format', '--write', ...paths], {
    encoding: 'utf8',
  });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout);
  for (const path of paths) {
    const data = readFileSync(path);
    console.log('SARA_FORMAT_BEGIN ' + path);
    console.log(data.toString('base64'));
    console.log('SARA_FORMAT_END ' + path);
  }
});
