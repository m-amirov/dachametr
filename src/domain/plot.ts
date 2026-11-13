import { Exact, ZERO, ONE, HUNDRED, THOUSAND } from "./exact.ts";

export type Material = "soil" | "sand" | "gravel";
export interface MaterialLayer {
  id: string;
  material: Material;
  material_spec_id: string;
  material_spec_label: string;
  thickness_cm: string;
  reserve_percent: string;
  package_l: string | null;
  density_kg_m3: string | null;
}
export interface Zone {
  id: string;
  length_m: string;
  width_m: string;
  layers: MaterialLayer[];
}
export interface PlotInput {
  plot: { length_m: string; width_m: string };
  zones: Zone[];
}
export interface BomRow {
  material: Material;
  material_spec_id: string;
  material_spec_label: string;
  package_l: string | null;
  density_kg_m3: string | null;
  net_l: string;
  purchase_l: string;
  packages: number | null;
  mass_required_kg: string | null;
  packed_volume_l: string | null;
  surplus_l: string | null;
  mass_purchased_kg: string | null;
}
export interface Calculated {
  plot_area_m2: string;
  zones_area_sum_m2: string;
  areas_exceed_plot: boolean;
  bom: BomRow[];
}
export interface ZoneLayerBreakdown {
  id: string;
  material_spec_id: string;
  material_spec_label: string;
  net_l: string;
  purchase_l: string;
  mass_required_kg: string | null;
}
export interface ZoneBreakdown {
  id: string;
  area_m2: string;
  layers: ZoneLayerBreakdown[];
}
export interface DetailedCalculated extends Calculated {
  zones: ZoneBreakdown[];
}
export type CalcResult<T = Calculated> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; path: string } };

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const RESERVED = new Set([
  "__proto__", "prototype", "constructor", "__definegetter__",
  "__definesetter__", "__lookupgetter__", "__lookupsetter__",
]);
const ALLOWED_MATERIALS = new Set<Material>(["soil", "sand", "gravel"]);
const MAX_PACKAGES = 9007199254740991n;
const MAX_ZONES = 50;
const MAX_LAYERS = 10;
const MAX_CHARS = 32;
const MAX_DECIMAL_PLACES = 12;

class DomainError extends Error {
  readonly code: string;
  readonly path: string;
  constructor(code: string, path: string) {
    super(`${code} at ${path}`);
    this.code = code;
    this.path = path;
  }
}
function invalid(code: string, path: string): never { throw new DomainError(code, path); }
function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid("invalid_model", path);
  return value as Record<string, unknown>;
}
function id(value: unknown, path: string, code: string): string {
  if (typeof value !== "string" || !IDENTIFIER.test(value) || RESERVED.has(value.toLowerCase())) invalid(code, path);
  return value;
}
function number(value: unknown, path: string, lower: Exact, upper: Exact, inclusiveLower: boolean): Exact {
  if (typeof value !== "string" || value.trim().length === 0) invalid("required", path);
  const normalized = value.trim();
  if (normalized.length > MAX_CHARS) invalid("input_too_long", path);
  if (!/^-?[0-9]+(?:[.,][0-9]+)?$/.test(normalized)) invalid("invalid_number", path);
  const digits = normalized.split(/[.,]/)[1] ?? "";
  if (digits.length > MAX_DECIMAL_PLACES) invalid("precision_exceeded", path);
  const parsed = Exact.decimal(normalized.replace(",", "."));
  if ((inclusiveLower ? parsed.compare(lower) < 0 : parsed.compare(lower) <= 0) || parsed.compare(upper) > 0)
    invalid("out_of_range", path);
  return parsed;
}
const LEN_MAX = Exact.decimal("100000");
const THICK_MAX = Exact.decimal("1000");
const DENSITY_MAX = Exact.decimal("100000");
const PACK_MAX = Exact.decimal("1000000000");
function optionalNumber(v: unknown, path: string, upper: Exact): Exact | null {
  return v === null ? null : number(v, path, ZERO, upper, false);
}
interface Working {
  material: Material;
  material_spec_id: string;
  material_spec_label: string;
  package: Exact | null;
  density: Exact | null;
  net: Exact;
  purchase: Exact;
}

/** Calculates the complete report and exact per-zone breakdown or fails closed. */
export function calculatePlotDetailed(input: unknown): CalcResult<DetailedCalculated> {
  try {
    const top = record(input, "$input");
    const plot = record(top.plot, "plot");
    const plotArea = number(plot.length_m, "plot.length_m", ZERO, LEN_MAX, false)
      .multiply(number(plot.width_m, "plot.width_m", ZERO, LEN_MAX, false));
    if (!Array.isArray(top.zones)) invalid("invalid_zones", "zones");
    if (top.zones.length > MAX_ZONES) invalid("too_many_zones", "zones");
    const zones = new Set<string>();
    const specs = new Map<string, { material: Material; label: string }>();
    const groups = new Map<string, Working>();
    const zoneBreakdown: ZoneBreakdown[] = [];
    let sumArea = ZERO;
    for (const [zi, maybeZone] of top.zones.entries()) {
      const where = `zones[${zi}]`;
      const zone = record(maybeZone, where);
      const zoneId = id(zone.id, `${where}.id`, "invalid_zone_id");
      if (zones.has(zoneId)) invalid("duplicate_zone_id", `${where}.id`);
      zones.add(zoneId);
      if (!Array.isArray(zone.layers)) invalid("invalid_layers", `${where}.layers`);
      if (zone.layers.length > MAX_LAYERS) invalid("too_many_layers", `${where}.layers`);
      const length = number(zone.length_m, `${where}.length_m`, ZERO, LEN_MAX, false);
      const width = number(zone.width_m, `${where}.width_m`, ZERO, LEN_MAX, false);
      const area = length.multiply(width);
      sumArea = sumArea.add(area);
      const layerBreakdown: ZoneLayerBreakdown[] = [];
      const layerIds = new Set<string>();
      for (const [li, maybeLayer] of zone.layers.entries()) {
        const lp = `${where}.layers[${li}]`;
        const layer = record(maybeLayer, lp);
        const layerId = id(layer.id, `${lp}.id`, "invalid_layer_id");
        if (layerIds.has(layerId)) invalid("duplicate_layer_id", `${lp}.id`);
        layerIds.add(layerId);
        if (typeof layer.material !== "string" || !ALLOWED_MATERIALS.has(layer.material as Material)) invalid("invalid_material", `${lp}.material`);
        const material = layer.material as Material;
        const specId = id(layer.material_spec_id, `${lp}.material_spec_id`, "invalid_material_spec_id");
        const label = layer.material_spec_label;
        if (typeof label !== "string" || label.trim().length === 0 || Array.from(label.trim()).length > 80 || label.includes("\uFFFD"))
          invalid("invalid_material_spec_label", `${lp}.material_spec_label`);
        const trimmed = label.trim();
        const existing = specs.get(specId);
        if (existing && (existing.material !== material || existing.label !== trimmed))
          invalid("conflicting_material_spec_definition", `${lp}.material_spec_id`);
        specs.set(specId, { material, label: trimmed });
        const thick = number(layer.thickness_cm, `${lp}.thickness_cm`, ZERO, THICK_MAX, false);
        const reserve = number(layer.reserve_percent, `${lp}.reserve_percent`, ZERO, HUNDRED, true);
        if (!("package_l" in layer)) invalid("required", `${lp}.package_l`);
        if (!("density_kg_m3" in layer)) invalid("required", `${lp}.density_kg_m3`);
        const pack = optionalNumber(layer.package_l, `${lp}.package_l`, PACK_MAX);
        const density = optionalNumber(layer.density_kg_m3, `${lp}.density_kg_m3`, DENSITY_MAX);
        // m² * cm / 100 * 1000 => liters; no intermediate display rounding.
        const net = area.multiply(thick).multiply(Exact.decimal("10"));
        const purchase = net.multiply(ONE.add(reserve.divide(HUNDRED)));
        const requiredMass = density === null ? null : purchase.multiply(density).divide(THOUSAND);
        layerBreakdown.push({
          id: layerId,
          material_spec_id: specId,
          material_spec_label: trimmed,
          net_l: net.toString(),
          purchase_l: purchase.toString(),
          mass_required_kg: requiredMass?.toString() ?? null,
        });
        const key = JSON.stringify([specId, material, pack?.toString() ?? null, density?.toString() ?? null]);
        const prev = groups.get(key);
        if (prev) {
          prev.net = prev.net.add(net);
          prev.purchase = prev.purchase.add(purchase);
        } else groups.set(key, { material, material_spec_id: specId, material_spec_label: trimmed, package: pack, density, net, purchase });
      }
      zoneBreakdown.push({ id: zoneId, area_m2: area.toString(), layers: layerBreakdown });
    }
    const bom: BomRow[] = [];
    for (const x of groups.values()) {
      const bigintPackages = x.package === null ? null : x.purchase.divide(x.package).ceil();
      if (bigintPackages !== null && bigintPackages > MAX_PACKAGES) invalid("package_count_overflow", "bom");
      const packages = bigintPackages === null ? null : Number(bigintPackages);
      const packed = bigintPackages === null || x.package === null ? null : x.package.multiply(new Exact(bigintPackages));
      const requiredMass = x.density === null ? null : x.purchase.multiply(x.density).divide(THOUSAND);
      const purchasedMass = x.density === null ? null : (packed ?? x.purchase).multiply(x.density).divide(THOUSAND);
      bom.push({
        material: x.material,
        material_spec_id: x.material_spec_id,
        material_spec_label: x.material_spec_label,
        package_l: x.package?.toString() ?? null,
        density_kg_m3: x.density?.toString() ?? null,
        net_l: x.net.toString(),
        purchase_l: x.purchase.toString(),
        packages,
        mass_required_kg: requiredMass?.toString() ?? null,
        packed_volume_l: packed?.toString() ?? null,
        surplus_l: packed?.subtract(x.purchase).toString() ?? null,
        mass_purchased_kg: purchasedMass?.toString() ?? null,
      });
    }
    return {
      ok: true,
      value: {
        plot_area_m2: plotArea.toString(),
        zones_area_sum_m2: sumArea.toString(),
        areas_exceed_plot: sumArea.compare(plotArea) > 0,
        bom,
        zones: zoneBreakdown,
      },
    };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, error: { code: err.code, path: err.path } };
    throw err;
  }
}

/** Backward-compatible summary API used by the existing golden fixtures. */
export function calculatePlot(input: unknown): CalcResult {
  const detailed = calculatePlotDetailed(input);
  if (!detailed.ok) return detailed;
  const { zones: _zones, ...summary } = detailed.value;
  return { ok: true, value: summary };
}
