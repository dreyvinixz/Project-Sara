import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';

test('web build emits an accessible app root and bundled assets', async () => {
  const index = await readFile(
    new URL('../dist/index.html', import.meta.url),
    'utf8',
  );
  assert.match(index, /<div id="root"><\/div>/);
  assert.match(index, /src="\/assets\/[^"]+\.js"/);
  const assets = new URL('../dist/assets/', import.meta.url);
  const scripts = (await readdir(assets)).filter((file) =>
    file.endsWith('.js'),
  );
  assert.ok(scripts.length > 0, 'expected a compiled JS bundle');
  for (const script of scripts) {
    const stats = await stat(new URL(script, assets));
    assert.ok(stats.size > 0, 'compiled asset cannot be empty');
  }
});
