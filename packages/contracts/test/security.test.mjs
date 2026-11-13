import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  assertSceneDocument,
  validateSceneDocument,
  validateUserAction,
} from '../index.mjs';

const market = JSON.parse(
  await readFile(new URL('../fixtures/market-overview.json', import.meta.url)),
);

test('rejects executable component fields and unknown types', () => {
  const scene = structuredClone(market);
  scene.components[0].onClick = 'globalThis.injected = true';
  assert.equal(validateSceneDocument(scene).valid, false);
  assert.throws(() => assertSceneDocument(scene), TypeError);
  delete scene.components[0].onClick;
  scene.components[0].type = 'script';
  assert.equal(validateSceneDocument(scene).valid, false);
});

test('HTML-like content is validated only as inert text', () => {
  const scene = structuredClone(market);
  globalThis.__saraInertTextProbe = false;
  scene.components[0].content =
    '<script>globalThis.__saraInertTextProbe = true</script>';
  assert.equal(validateSceneDocument(scene).valid, true);
  assert.equal(globalThis.__saraInertTextProbe, false);
  delete globalThis.__saraInertTextProbe;
});

test('rejects unsafe link schemes and stale actions', () => {
  const scene = structuredClone(market);
  scene.references[0].url = 'javascript:alert(1)';
  assert.equal(validateSceneDocument(scene).valid, false);

  const event = {
    schemaVersion: '0.0',
    type: 'user_action',
    sessionId: market.sessionId,
    sceneRevision: market.revision + 1,
    actionId: 'select_market_event',
    componentId: 'index',
  };
  assert.equal(validateUserAction(event, market).valid, false);
});
