/** Unit definitions. Linear units use a factor to the category's base unit; temperature is handled separately. */

export interface Unit {
  id: string;
  label: string;
  /** Multiply by this to get the base unit (linear categories). */
  factor?: number;
  toBase?: (v: number) => number;
  fromBase?: (v: number) => number;
}
export interface Category {
  id: string;
  label: string;
  units: Unit[];
}

export const CATEGORIES: Category[] = [
  {
    id: "length",
    label: "Length",
    units: [
      { id: "mm", label: "Millimetre", factor: 0.001 },
      { id: "cm", label: "Centimetre", factor: 0.01 },
      { id: "m", label: "Metre", factor: 1 },
      { id: "km", label: "Kilometre", factor: 1000 },
      { id: "in", label: "Inch", factor: 0.0254 },
      { id: "ft", label: "Foot", factor: 0.3048 },
      { id: "yd", label: "Yard", factor: 0.9144 },
      { id: "mi", label: "Mile", factor: 1609.344 },
    ],
  },
  {
    id: "weight",
    label: "Weight",
    units: [
      { id: "mg", label: "Milligram", factor: 0.000001 },
      { id: "g", label: "Gram", factor: 0.001 },
      { id: "kg", label: "Kilogram", factor: 1 },
      { id: "oz", label: "Ounce", factor: 0.028349523125 },
      { id: "lb", label: "Pound", factor: 0.45359237 },
      { id: "st", label: "Stone", factor: 6.35029318 },
    ],
  },
  {
    id: "temp",
    label: "Temperature",
    units: [
      { id: "c", label: "Celsius", toBase: (v) => v, fromBase: (v) => v },
      { id: "f", label: "Fahrenheit", toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: "k", label: "Kelvin", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: "volume",
    label: "Volume",
    units: [
      { id: "ml", label: "Millilitre", factor: 0.001 },
      { id: "l", label: "Litre", factor: 1 },
      { id: "tsp", label: "Teaspoon (US)", factor: 0.00492892159375 },
      { id: "tbsp", label: "Tablespoon (US)", factor: 0.01478676478125 },
      { id: "cup", label: "Cup (US)", factor: 0.2365882365 },
      { id: "pt", label: "Pint (US)", factor: 0.473176473 },
      { id: "gal", label: "Gallon (US)", factor: 3.785411784 },
    ],
  },
  {
    id: "speed",
    label: "Speed",
    units: [
      { id: "ms", label: "Metres/second", factor: 1 },
      { id: "kmh", label: "Kilometres/hour", factor: 1 / 3.6 },
      { id: "mph", label: "Miles/hour", factor: 0.44704 },
      { id: "kn", label: "Knot", factor: 0.514444444 },
    ],
  },
  {
    id: "data",
    label: "Data",
    units: [
      { id: "b", label: "Byte", factor: 1 },
      { id: "kb", label: "Kilobyte (1000)", factor: 1e3 },
      { id: "mb", label: "Megabyte (1000²)", factor: 1e6 },
      { id: "gb", label: "Gigabyte (1000³)", factor: 1e9 },
      { id: "kib", label: "Kibibyte (1024)", factor: 1024 },
      { id: "mib", label: "Mebibyte (1024²)", factor: 1024 ** 2 },
      { id: "gib", label: "Gibibyte (1024³)", factor: 1024 ** 3 },
    ],
  },
];

export function convert(value: number, from: Unit, to: Unit): number {
  const base = from.toBase ? from.toBase(value) : value * (from.factor as number);
  return to.fromBase ? to.fromBase(base) : base / (to.factor as number);
}

export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "–";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(4);
  return String(Number(n.toPrecision(8)));
}
