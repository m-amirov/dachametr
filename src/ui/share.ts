import type { AppState, LayerDraft, MaterialKind, MaterialSpecDraft, ZoneDraft } from './model.ts';
import { validateDraft } from './validation.ts';

export const SHARE_HASH_PREFIX = '#dm=';
const CURRENT_VERSION = 1;
// Browser/address-bar, messenger and QR clients can truncate long URLs.
// Fail closed instead of copying an incomplete calculation.
export const MAX_SHARE_HASH_LENGTH = 8192;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;

type DecodeResult =
  | { ok: true; state: AppState }
  | { ok: false; reason: 'invalid' | 'unsupported_version' };

function objectWithKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

function tuple(value: unknown, size: number): unknown[] | null {
  return Array.isArray(value) && value.length === size ? value : null;
}

function text(value: unknown, max: number, allowEmpty = true): value is string {
  return typeof value === 'string' &&
    value.length <= max &&
    (allowEmpty || value.trim().length > 0) &&
    !/[\u0000-\u001f\u007f\uFFFD]/u.test(value);
}

function safeId(value: unknown): value is string {
  return text(value, 64, false) && IDENTIFIER.test(value) &&
    !['__proto__', 'prototype', 'constructor', '__definegetter__', '__definesetter__', '__lookupgetter__', '__lookupsetter__'].includes(value.toLowerCase());
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid base64url');
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
  const decoded = Uint8Array.from(binary, char => char.charCodeAt(0));
  if (base64Url(decoded) !== value) throw new Error('non-canonical base64url');
  return decoded;
}

/**
 * Only live, domain-valid calculations are shareable. The fragment is a snapshot
 * of input fields, never a cache of calculated totals. No query parameters, server
 * request, cookies, localStorage or third-party tracking.
 */
export function encodeSharedCalculation(state: AppState): string | null {
  const validation = validateDraft(state);
  if (!validation.valid || !validation.result?.ok) return null;

  const referenced = new Set(state.zones.flatMap(zone => zone.layers.map(layer => layer.materialSpecId)));
  const materials = state.materials.filter(material => referenced.has(material.id));
  if (materials.length !== referenced.size || materials.length > 500) return null;
  const payload = {
    v: CURRENT_VERSION,
    p: [state.plot.length, state.plot.width],
    m: materials.map(material => [material.id, material.material, material.label]),
    z: state.zones.map(zone => [
      zone.id, zone.name, zone.length, zone.width,
      zone.layers.map(layer => [layer.id, layer.materialSpecId, layer.thickness, layer.reserve, layer.packageL, layer.density]),
    ]),
  };
  // Use exactly the same decoder as inbound links, so unsafe names/IDs are
  // not silently distributed through "valid" UI state.
  const fragment = SHARE_HASH_PREFIX + CURRENT_VERSION + '.' + base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return fragment.length <= MAX_SHARE_HASH_LENGTH && decodeSharedCalculation(fragment).ok ? fragment : null;
}

export function isSharedCalculationHash(hash: string): boolean {
  return hash.startsWith(SHARE_HASH_PREFIX);
}

/** Strict schema/size/version/UTF-8 check before handing data to the domain engine. */
export function decodeSharedCalculation(hash: string): DecodeResult {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return { ok: false, reason: 'invalid' };
  const versionAndData = hash.slice(SHARE_HASH_PREFIX.length);
  if (!versionAndData.startsWith(CURRENT_VERSION + '.')) return { ok: false, reason: 'unsupported_version' };
  const token = versionAndData.slice(2);
  if (hash.length > MAX_SHARE_HASH_LENGTH || token.length === 0) return { ok: false, reason: 'invalid' };

  try {
    const json = new TextDecoder('utf-8', { fatal: true }).decode(fromBase64Url(token));
    const payload: unknown = JSON.parse(json);
    if (!objectWithKeys(payload, ['v', 'p', 'm', 'z']) || payload.v !== CURRENT_VERSION) throw new Error('payload version');
    const p = tuple(payload.p, 2);
    if (!p || !p.every(value => text(value, 32))) throw new Error('plot');
    if (!Array.isArray(payload.m) || payload.m.length > 500 || !Array.isArray(payload.z) || payload.z.length > 50) throw new Error('collections');

    const materials: MaterialSpecDraft[] = [];
    const materialIds = new Set<string>();
    for (const value of payload.m) {
      const fields = tuple(value, 3);
      if (!fields) throw new Error('material');
      const [id, kind, label] = fields;
      if (!safeId(id) || (kind !== 'soil' && kind !== 'sand' && kind !== 'gravel') || !text(label, 80, false)) throw new Error('material fields');
      if (materialIds.has(id)) throw new Error('duplicate material');
      materialIds.add(id);
      materials.push({ id, material: kind as MaterialKind, label });
    }

    const zones: ZoneDraft[] = [];
    const zoneIds = new Set<string>();
    const layerIds = new Set<string>();
    const usedMaterials = new Set<string>();
    for (const value of payload.z) {
      const fields = tuple(value, 5);
      if (!fields) throw new Error('zone');
      const [id, name, length, width, rawLayers] = fields;
      if (!safeId(id) || !text(name, 80) || !text(length, 32) || !text(width, 32) || !Array.isArray(rawLayers) || rawLayers.length > 10) throw new Error('zone fields');
      if (zoneIds.has(id)) throw new Error('duplicate zone');
      zoneIds.add(id);
      const layers: LayerDraft[] = [];
      for (const rawLayer of rawLayers) {
        const layerFields = tuple(rawLayer, 6);
        if (!layerFields) throw new Error('layer');
        const [layerId, specId, thickness, reserve, packageL, density] = layerFields;
        if (!safeId(layerId) || !safeId(specId) || !materialIds.has(specId) || ![thickness, reserve, packageL, density].every(field => text(field, 32))) throw new Error('layer fields');
        if (layerIds.has(layerId)) throw new Error('duplicate layer');
        layerIds.add(layerId);
        usedMaterials.add(specId);
        layers.push({ id: layerId, materialSpecId: specId, thickness: thickness as string, reserve: reserve as string, packageL: packageL as string, density: density as string });
      }
      zones.push({ id, name: name as string, length: length as string, width: width as string, layers });
    }
    if (usedMaterials.size !== materialIds.size) throw new Error('orphan material');
    const state: AppState = { plot: { length: p[0] as string, width: p[1] as string }, zones, materials };
    const validation = validateDraft(state);
    if (!validation.valid || !validation.result?.ok) throw new Error('invalid calculation');
    return { ok: true, state };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
