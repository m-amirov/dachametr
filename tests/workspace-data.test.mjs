import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { calculatePlotDetailed } from '../src/domain/plot.ts';

const scenarioPath = new URL('../artifacts/dachametr-workspace/scenario.json', import.meta.url);

test('workspace scenario is present and bound to the exact domain calculation', () => {
  assert.equal(existsSync(scenarioPath), true, 'run scripts/generate-workspace-scenario.mjs first');
  const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'));
  const result = calculatePlotDetailed(scenario.input);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.error));
  if (!result.ok) return;
  assert.deepEqual(scenario.calculated, result.value);
  assert.equal(scenario.input.plot.length_m, '20');
  assert.equal(scenario.input.plot.width_m, '30');
  assert.deepEqual(
    scenario.input.zones.map(zone => [zone.id, zone.length_m, zone.width_m]),
    [['bed', '2', '4'], ['path', '2', '5']],
  );
  assert.deepEqual(
    scenario.input.zones.flatMap(zone => zone.layers.map(layer => layer.material)),
    ['soil', 'sand', 'gravel'],
  );
});

test('workspace scenario exposes exact procurement values rather than rounded display copies', () => {
  const scenario = JSON.parse(readFileSync(scenarioPath, 'utf8'));
  const rows = scenario.calculated.bom;
  assert.deepEqual(rows.map(row => row.material), ['soil', 'sand', 'gravel']);
  assert.deepEqual(rows.map(row => row.purchase_l), ['2000', '1050', '550']);
  assert.deepEqual(rows.map(row => row.packages), [40, 21, 11]);
  assert.deepEqual(rows.map(row => row.surplus_l), ['0', '0', '0']);
  assert.deepEqual(rows.map(row => row.mass_required_kg), [null, '1575', '770']);
});
