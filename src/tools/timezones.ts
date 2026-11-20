/** Time-zone helpers for the world clock. Uses the platform's Intl data, so DST is always right. */

export interface City {
  name: string;
  tz: string;
}

export const CITIES: City[] = [
  { name: "London", tz: "Europe/London" }, { name: "Paris", tz: "Europe/Paris" }, { name: "Berlin", tz: "Europe/Berlin" },
  { name: "Madrid", tz: "Europe/Madrid" }, { name: "Istanbul", tz: "Europe/Istanbul" }, { name: "Moscow", tz: "Europe/Moscow" },
  { name: "Cairo", tz: "Africa/Cairo" }, { name: "Nairobi", tz: "Africa/Nairobi" }, { name: "Lagos", tz: "Africa/Lagos" },
  { name: "Johannesburg", tz: "Africa/Johannesburg" }, { name: "Dubai", tz: "Asia/Dubai" }, { name: "Karachi", tz: "Asia/Karachi" },
  { name: "Mumbai", tz: "Asia/Kolkata" }, { name: "Colombo", tz: "Asia/Colombo" }, { name: "Dhaka", tz: "Asia/Dhaka" },
  { name: "Bangkok", tz: "Asia/Bangkok" }, { name: "Singapore", tz: "Asia/Singapore" }, { name: "Hong Kong", tz: "Asia/Hong_Kong" },
  { name: "Shanghai", tz: "Asia/Shanghai" }, { name: "Seoul", tz: "Asia/Seoul" }, { name: "Tokyo", tz: "Asia/Tokyo" },
  { name: "Sydney", tz: "Australia/Sydney" }, { name: "Auckland", tz: "Pacific/Auckland" }, { name: "Honolulu", tz: "Pacific/Honolulu" },
  { name: "Los Angeles", tz: "America/Los_Angeles" }, { name: "Denver", tz: "America/Denver" }, { name: "Chicago", tz: "America/Chicago" },
  { name: "New York", tz: "America/New_York" }, { name: "Toronto", tz: "America/Toronto" }, { name: "Mexico City", tz: "America/Mexico_City" },
  { name: "São Paulo", tz: "America/Sao_Paulo" }, { name: "Buenos Aires", tz: "America/Argentina/Buenos_Aires" },
];

/** Offset of `tz` from UTC at `date`, in minutes (east is positive). */
export function offsetMinutes(tz: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(date);
  const v = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** "+5h 30m", "-3h", "same time". */
export function describeDifference(diffMinutes: number): string {
  if (diffMinutes === 0) return "same time";
  const sign = diffMinutes > 0 ? "+" : "-";
  const abs = Math.abs(diffMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m ? ` ${m}m` : ""}`;
}

/** Whether `tz` is on an earlier / same / later calendar day than `localTz`. */
export function dayRelation(tz: string, localTz: string, date: Date): "yesterday" | "today" | "tomorrow" {
  const day = (z: string) => new Intl.DateTimeFormat("en-CA", { timeZone: z, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const [a, b] = [day(tz), day(localTz)];
  return a === b ? "today" : a > b ? "tomorrow" : "yesterday";
}

export const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
