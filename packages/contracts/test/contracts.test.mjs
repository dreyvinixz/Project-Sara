import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertSceneDocument, validateSceneDocument, validateUserAction } from '../index.mjs';

const market = JSON.parse(await readFile(new URL('../fixtures/market-overview.json', import.meta.url)));
const neural = JSON.parse(await readFile(new URL('../fixtures/neural-network-lesson.json', import.meta.url)));

test('both offline fixtures satisfy the SceneDocument contract', () => {
  assert.deepEqual(validateSceneDocument(market), { valid: true, errors: [] });
  assert.deepEqual(validateSceneDocument(neural), { valid: true, errors: [] });
});

test('rejects unknown component types and arbitrary executable fields', () => {
  const invalid = structuredClone(market);
  invalid.components[0].type = 'script';
  invalid.components[0].code = 'alert(1)';
  assert.equal(validateSceneDocument(invalid).valid, false);
});

test('rejects dangling action targets and duplicate component ids', () => {
  const dangling = structuredClone(market);
  dangling.actions[0].targetComponentId = 'missing';
  assert.equal(validateSceneDocument(dangling).valid, false);
  const duplicate = structuredClone(market);
  duplicate.components[1].id = duplicate.components[0].id;
  assert.equal(validateSceneDocument(duplicate).valid, false);
});

test('rejects malformed 3D matrix dimensions and invalid slider ranges', () => {
  const badNetwork = structuredClone(neural);
  badNetwork.components.find(({ type }) => type === 'scene_3d').weights[0][0].pop();
  assert.equal(validateSceneDocument(badNetwork).valid, false);
  const badSlider = structuredClone(neural);
  badSlider.components.find(({ type }) => type === 'control').value = 2;
  assert.equal(validateSceneDocument(badSlider).valid, false);
});

test('rejects HTTP, credential-bearing, and malformed reference URLs', () => {
  for (const url of ['http://example.com', 'https://user:secret@example.com', 'https://']) {
    const invalid = structuredClone(market);
    invalid.references[0].url = url;
    assert.equal(validateSceneDocument(invalid).valid, false, url);
  }
});

test('validates user_action shape and assert helper throws for invalid documents', () => {
  const event = { schemaVersion: '0.0', type: 'user_action', sessionId: 'demo_neural', sceneRevision: 0, actionId: 'adjust_network', componentId: 'network', value: 0.7 };
  assert.equal(validateUserAction(event, neural).valid, true);
  assert.equal(validateUserAction({ ...event, componentId: 'lesson' }, neural).valid, false);
  assert.equal(validateUserAction({ schemaVersion: '0.0', type: 'user_action', sessionId: 'demo', sceneRevision: -1, actionId: 'bad id', componentId: 'network' }).valid, false);
  assert.throws(() => assertSceneDocument({}), TypeError);
});
