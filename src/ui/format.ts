export function formatRuNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const source = String(value).trim().replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(source)) return String(value);
  const negative = source.startsWith('-');
  const unsigned = negative ? source.slice(1) : source;
  const [integer = '0', fraction] = unsigned.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${negative ? '-' : ''}${grouped}${fraction ? `,${fraction}` : ''}`;
}

export function formatUnit(value: string | number | null | undefined, unit: string): string {
  const formatted = formatRuNumber(value);
  return formatted === '—' ? formatted : `${formatted} ${unit}`;
}

/** Each individual domain package count is safe, but its total may exceed MAX_SAFE_INTEGER. */
export function sumWholePackages(packages: readonly (number | null)[]): string | null {
  if (packages.length === 0 || packages.some(count => count === null)) return null;
  return packages.reduce<bigint>((sum, count) => sum + BigInt(count ?? 0), 0n).toString();
}
