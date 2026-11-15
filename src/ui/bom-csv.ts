import type { BomRow, DetailedCalculated } from '../domain/plot.ts';
import type { MaterialKind } from './model.ts';

const KIND: Record<MaterialKind, string> = {
  soil: 'Грунт',
  sand: 'Песок',
  gravel: 'Щебень',
};

export const BOM_CSV_FILENAME = 'dachametr-vedomost.csv';
export const BOM_CSV_MIME = 'text/csv;charset=utf-8';

// UTF-8 BOM improves Cyrillic detection in Excel on Windows.
// Semicolons let Russian-locale Excel parse decimal commas as numeric cells.
const HEADER = [
  'Название материала',
  'Тип',
  'ID варианта',
  'Способ закупки',
  'Чистый объём, л',
  'Нужно с запасом, л',
  'Объём упаковки, л',
  'Количество упаковок, шт',
  'Закупочный объём, л',
  'Излишек, л',
  'Масса требуемая, кг',
  'Масса закупленная, кг',
] as const;

/**
 * Formula escaping applies even to otherwise quoted CSV fields: spreadsheets
 * may evaluate strings that start with =,+,-,@. Flatten control characters
 * so names cannot inject rows/columns or bypass the leading-character guard.
 */
function safeText(value: string): string {
  const flattened = value.replace(/[\u0000-\u001f\u007f-\u009f\uFEFF\u2028\u2029]+/gu, ' ');
  const leftTrimmed = flattened.trimStart();
  return /^[=+\-@]/u.test(leftTrimmed) ? "'" + flattened : flattened;
}

/** Never convert exact quantities through JS Number. Comma is presentation only.
 * Excel can silently round cells with >15 digits; force those to text.
 */
function csvExact(value: string | number | null): string {
  if (value === null) return '';
  const source = String(value);
  if (!/^\d+(?:\.\d+)?$/u.test(source)) throw new Error('Unexpected domain decimal in CSV');
  const digits = source.replace(/\D/gu, '');
  const localized = source.replace('.', ',');
  return digits.length > 15 ? "'" + localized : localized;
}

function quoteCsv(value: string): string {
  return '"' + safeText(value).replaceAll('"', '""') + '"';
}

function rowCells(row: BomRow): string[] {
  return [
    row.material_spec_label,
    KIND[row.material],
    row.material_spec_id,
    row.package_l === null ? 'Россыпью / по объёму' : 'В упаковках',
    csvExact(row.net_l),
    csvExact(row.purchase_l),
    csvExact(row.package_l),
    csvExact(row.packages),
    csvExact(row.packed_volume_l),
    csvExact(row.surplus_l),
    csvExact(row.mass_required_kg),
    csvExact(row.mass_purchased_kg),
  ];
}

/**
 * The sole source of quantities is a verified DetailedCalculated snapshot.
 * No recomputation, sorting, merging material specs, rounding or invented
 * packaging/density; a blank cell explicitly means "not provided".
 */
export function formatBomCsv(result: DetailedCalculated): string {
  if (result.bom.length === 0) return '';
  const lines = [
    HEADER.map(quoteCsv).join(';'),
    ...result.bom.map(row => rowCells(row).map(quoteCsv).join(';')),
  ];
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
