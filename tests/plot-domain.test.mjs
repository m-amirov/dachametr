import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { calculatePlot } from '../src/domain/plot.ts';
import { Exact } from '../src/domain/exact.ts';

const fixtures = JSON.parse(readFileSync(new URL('../docs/specs/plot-zones-materials-cases.json', import.meta.url), 'utf-8'));

const success = value => {
  const result = calculatePlot(value);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.error));
  return result.value;
};

test('all 16 independent golden cases match the production TS domain engine', () => {
  assert.equal(fixtures.valid_cases.length, 16);
  for (const c of fixtures.valid_cases) {
    const actual = calculatePlot({ plot: c.plot, zones: c.zones });
    assert.equal(actual.ok, true, c.id + ' ' + (actual.ok ? '' : JSON.stringify(actual.error)));
    assert.deepEqual(actual.value, c.expected, c.id);
  }
});

test('all 21 invalid structural models fail closed with the specified error', () => {
  assert.equal(fixtures.invalid_model_cases.length, 21);
  for (const c of fixtures.invalid_model_cases) {
    const actual = calculatePlot(c.case);
    assert.equal(actual.ok, false, c.id);
    assert.equal(actual.error.code, c.expected_error, c.id);
  }
});

test('all 16 invalid numeric inputs produce the specified error', () => {
  assert.equal(fixtures.invalid_number_cases.length, 16);
  const reference = fixtures.valid_cases[0];
  for (const c of fixtures.invalid_number_cases) {
    const model = structuredClone({ plot: reference.plot, zones: reference.zones });
    if ('min_inclusive' in (c.constraints ?? {})) model.zones[0].layers[0].reserve_percent = c.input;
    else model.plot.length_m = c.input;
    const actual = calculatePlot(model);
    assert.equal(actual.ok, false, JSON.stringify(c));
    assert.equal(actual.error.code, c.expected_error, JSON.stringify(c));
  }
});

test('permuting zones does not change physical quantities or compatible BOM groups', () => {
  const project = outcome => Object.fromEntries(outcome.bom.map(row => [
    JSON.stringify([row.material_spec_id, row.material, row.package_l, row.density_kg_m3]),
    [row.net_l, row.purchase_l, row.packages, row.mass_required_kg, row.packed_volume_l, row.surplus_l, row.mass_purchased_kg]
  ]));
  for (const c of fixtures.valid_cases) {
    const forward = success({ plot: c.plot, zones: c.zones });
    const backward = success({ plot: c.plot, zones: [...c.zones].reverse() });
    assert.equal(forward.plot_area_m2, backward.plot_area_m2, c.id);
    assert.equal(forward.zones_area_sum_m2, backward.zones_area_sum_m2, c.id);
    assert.deepEqual(project(forward), project(backward), c.id);
  }
});

test('three tenths need exactly one 0.3L package, not a floating point extra package', () => {
  assert.equal(
    Exact.decimal('0.1').add(Exact.decimal('0.1')).add(Exact.decimal('0.1')).toString(),
    '0.3'
  );
  const example = fixtures.valid_cases.find(c => c.id === 'decimal-tenths-exact-group');
  assert.equal(success({ plot: example.plot, zones: example.zones }).bom[0].packages, 1);
});

test('invalid last zone invalidates the entire BOM, never returns partial results', () => {
  const c = structuredClone(fixtures.valid_cases.find(c => c.id === 'group-before-ceil'));
  c.zones[1].layers[0].thickness_cm = 'bad';
  const result = calculatePlot({ plot: c.plot, zones: c.zones });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid_number');
  assert.equal('value' in result, false);
});

test('reserved JavaScript identifiers and conflicting material variants are refused', () => {
  const c = structuredClone(fixtures.valid_cases[0]);
  c.zones[0].layers[0].material_spec_id = '__proto__';
  assert.equal(calculatePlot({ plot: c.plot, zones: c.zones }).error.code, 'invalid_material_spec_id');
  const d = structuredClone(fixtures.valid_cases.find(c => c.id === 'different-soil-grades-separate'));
  assert.deepEqual(success({ plot: d.plot, zones: d.zones }).bom.map(x => x.packages), [2, 2]);
});

test('whole package demand and purchased mass are explicitly different', () => {
  const c = fixtures.valid_cases.find(c => c.id === 'packed-density-vs-demand');
  const row = success({ plot: c.plot, zones: c.zones }).bom[0];
  assert.equal(row.mass_required_kg, '100');
  assert.equal(row.mass_purchased_kg, '120');
  assert.equal(row.surplus_l, '20');
});
