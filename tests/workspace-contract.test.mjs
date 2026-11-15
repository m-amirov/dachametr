import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const prototypeDir = new URL('../artifacts/dachametr-workspace/', import.meta.url);

test('workspace contract has a self-contained prototype entrypoint', () => {
  for (const file of ['index.html', 'styles.css', 'app.js', 'scenario.json']) {
    assert.equal(existsSync(new URL(file, prototypeDir)), true, file);
  }
});

test('workspace copy does not promise persistence or invent zone placement', () => {
  const html = readFileSync(new URL('index.html', prototypeDir), 'utf8');
  const app = readFileSync(new URL('app.js', prototypeDir), 'utf8');
  const copy = `${html}\n${app}`;
  assert.match(copy, /не сохраняются|не сохраняется|не обещает сохранение/i);
  assert.match(copy, /не показывает её положение|не схема размещения|только выбранн/i);
  assert.doesNotMatch(copy, /автосохранен|GPS|кадастр/i);
});
