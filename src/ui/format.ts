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
