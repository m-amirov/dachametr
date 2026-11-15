import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addLayer, addZone, createInitialState, updateLayerField,
  updateMaterialSpec, updatePlotField, updateZoneField,
} from '../src/ui/model.ts';
import {
  SHARE_HASH_PREFIX, MAX_SHARE_HASH_LENGTH,
  decodeSharedCalculation, encodeSharedCalculation, isSharedCalculationHash,
} from '../src/ui/share.ts';

function completeState() {
  let state = createInitialState();
  state = updatePlotField(state, 'length', '20,5');
  state = updatePlotField(state, 'width', '30');
  state = addZone(state);
  const zoneId = state.zones[0].id;
  state = updateZoneField(state, zoneId, 'name', 'Грядка — северная');
  state = updateZoneField(state, zoneId, 'length', '2');
  state = updateZoneField(state, zoneId, 'width', '4');
  state = addLayer(state, zoneId);
  const layer = state.zones[0].layers[0];
  state = updateMaterialSpec(state, layer.materialSpecId, 'label', 'Грунт ёлочный');
  state = updateLayerField(state, zoneId, layer.id, 'thickness', '25');
  state = updateLayerField(state, zoneId, layer.id, 'reserve', '5');
  state = updateLayerField(state, zoneId, layer.id, 'packageL', '50');
  state = updateLayerField(state, zoneId, layer.id, 'density', '1100');
  return state;
}

function payloadFromHash(hash) {
  return JSON.parse(Buffer.from(hash.slice(SHARE_HASH_PREFIX.length + 2), 'base64url').toString('utf8'));
}

function hashFromPayload(payload) {
  return SHARE_HASH_PREFIX + '1.' + Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

test('versioned share hash round-trips UTF-8 input fields without cached arithmetic', () => {
  const original = completeState();
  const hash = encodeSharedCalculation(original);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.startsWith('#dm=1.'), true);
  assert.equal(hash.length <= MAX_SHARE_HASH_LENGTH, true);
  assert.equal(isSharedCalculationHash(hash), true);
  const payload = payloadFromHash(hash);
  assert.deepEqual(Object.keys(payload).sort(), ['m', 'p', 'v', 'z']);
  assert.equal(payload.p[0], '20,5');
  assert.deepEqual(payload.m[0], ['spec-1', 'soil', 'Грунт ёлочный']);
  assert.equal(payload.result, undefined);
  assert.equal(payload.total, undefined);

  const restored = decodeSharedCalculation(hash);
  assert.equal(restored.ok, true);
  if (restored.ok) assert.deepEqual(restored.state, original);
});

test('invalid intermediate inputs and unsafe text never create share links', () => {
  let state = completeState();
  state = updateZoneField(state, state.zones[0].id, 'length', '1,');
  assert.equal(encodeSharedCalculation(state), null);
  const longName = completeState();
  longName.zones[0].name = 'С'.repeat(81);
  assert.equal(encodeSharedCalculation(longName), null);
  assert.equal(isSharedCalculationHash('#result'), false);
});

test('malformed, huge, unsupported and invalid UTF-8 fragments are rejected fail-closed', () => {
  assert.deepEqual(decodeSharedCalculation('#dm=2.abc'), { ok: false, reason: 'unsupported_version' });
  assert.deepEqual(decodeSharedCalculation('#dm=1.A!'), { ok: false, reason: 'invalid' });
  assert.deepEqual(decodeSharedCalculation('#dm=1.' + 'A'.repeat(MAX_SHARE_HASH_LENGTH)), { ok: false, reason: 'invalid' });
  const invalidUtf8 = SHARE_HASH_PREFIX + '1.' + Buffer.from([0xc3, 0x28]).toString('base64url');
  assert.deepEqual(decodeSharedCalculation(invalidUtf8), { ok: false, reason: 'invalid' });
});

test('decoder rejects untrusted schema extensions, orphan specs and duplicate IDs', () => {
  const hash = encodeSharedCalculation(completeState());
  assert.ok(hash);
  const altered = payloadFromHash(hash);
  altered.debug = 'untrusted';
  assert.equal(decodeSharedCalculation(hashFromPayload(altered)).ok, false);

  const orphan = payloadFromHash(hash);
  orphan.m.push(['spec-2', 'sand', 'Песок']);
  assert.equal(decodeSharedCalculation(hashFromPayload(orphan)).ok, false);

  const duplicate = payloadFromHash(hash);
  duplicate.z.push(structuredClone(duplicate.z[0]));
  assert.equal(decodeSharedCalculation(hashFromPayload(duplicate)).ok, false);

  const unknownMaterial = payloadFromHash(hash);
  unknownMaterial.z[0][4][0][1] = 'spec-x';
  assert.equal(decodeSharedCalculation(hashFromPayload(unknownMaterial)).ok, false);
});

test('no passive server state or unused material variants are serialized', () => {
  const original = completeState();
  original.materials.push({ id: 'spec-99', material: 'sand', label: 'Unused material' });
  const hash = encodeSharedCalculation(original);
  assert.ok(hash);
  const restored = decodeSharedCalculation(hash);
  assert.equal(restored.ok, true);
  if (restored.ok) {
    assert.equal(restored.state.materials.length, 1);
    assert.equal(restored.state.materials[0].id, 'spec-1');
  }
});

test('distinct material specifications remain separate on a shared link', () => {
  let state = completeState();
  state = addZone(state);
  const secondId = state.zones[1].id;
  state = updateZoneField(state, secondId, 'name', 'Дорожка');
  state = updateZoneField(state, secondId, 'length', '2');
  state = updateZoneField(state, secondId, 'width', '5');
  state = addLayer(state, secondId);
  const layer = state.zones[1].layers[0];
  state = updateMaterialSpec(state, layer.materialSpecId, 'label', 'Грунт ёлочный');
  state = updateLayerField(state, secondId, layer.id, 'thickness', '10');
  const hash = encodeSharedCalculation(state);
  assert.ok(hash);
  const restored = decodeSharedCalculation(hash);
  assert.equal(restored.ok, true);
  if (restored.ok) {
    assert.deepEqual(restored.state.materials.map(spec => spec.id), ['spec-1', 'spec-2']);
    assert.deepEqual(restored.state.zones.map(zone => zone.layers.map(layer => layer.materialSpecId)), [['spec-1'], ['spec-2']]);
  }
});
