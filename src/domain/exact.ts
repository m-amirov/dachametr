/** Exact nonnegative/negative decimal rational, for reproducible volume and purchase rounding.
 * No IEEE-754 floating-point arithmetic enters the calculator domain.
 */
function gcd(a: bigint, b: bigint): bigint {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a === 0n ? 1n : a;
}

export class Exact {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new RangeError("zero_denominator");
    if (d < 0n) { n = -n; d = -d; }
    const common = gcd(n, d);
    this.n = n / common;
    this.d = d / common;
  }

  static decimal(value: string): Exact {
    const matched = /^(-?)([0-9]+)(?:\.([0-9]+))?$/.exec(value);
    if (!matched) throw new RangeError("invalid_decimal");
    const fraction = matched[3] ?? "";
    const n = BigInt(matched[2] + fraction) * (matched[1] === "-" ? -1n : 1n);
    return new Exact(n, 10n ** BigInt(fraction.length));
  }

  add(other: Exact): Exact { return new Exact(this.n * other.d + other.n * this.d, this.d * other.d); }
  subtract(other: Exact): Exact { return new Exact(this.n * other.d - other.n * this.d, this.d * other.d); }
  multiply(other: Exact): Exact { return new Exact(this.n * other.n, this.d * other.d); }
  divide(other: Exact): Exact {
    if (other.n === 0n) throw new RangeError("division_by_zero");
    return new Exact(this.n * other.d, this.d * other.n);
  }
  compare(other: Exact): -1 | 0 | 1 {
    const delta = this.n * other.d - other.n * this.d;
    return delta < 0n ? -1 : delta > 0n ? 1 : 0;
  }
  ceil(): bigint {
    const quotient = this.n / this.d;
    const rem = this.n % this.d;
    return rem > 0n ? quotient + 1n : quotient;
  }
  /** All our inputs and physical conversions have finite base-10 expansions. */
  toString(): string {
    if (this.n === 0n) return "0";
    let denominator = this.d;
    let twos = 0;
    let fives = 0;
    while (denominator % 2n === 0n) { denominator /= 2n; twos++; }
    while (denominator % 5n === 0n) { denominator /= 5n; fives++; }
    if (denominator !== 1n) throw new RangeError("non_terminating_decimal");
    const places = Math.max(twos, fives);
    const abs = this.n < 0n ? -this.n : this.n;
    const scaled = abs * (10n ** BigInt(places)) / this.d;
    const sign = this.n < 0n ? "-" : "";
    if (places === 0) return sign + scaled.toString();
    const digits = scaled.toString().padStart(places + 1, "0");
    const integer = digits.slice(0, -places);
    const fraction = digits.slice(-places).replace(/0+$/, "");
    return sign + integer + (fraction ? "." + fraction : "");
  }
}

export const ZERO = new Exact(0n);
export const ONE = new Exact(1n);
export const HUNDRED = new Exact(100n);
export const THOUSAND = new Exact(1000n);
