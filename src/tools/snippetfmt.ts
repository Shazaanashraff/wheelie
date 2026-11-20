/** Expand {date} {time} {datetime} {weekday} in a snippet. Unknown {braces} are left alone, so code snippets are safe. */

const p2 = (n: number) => String(n).padStart(2, "0");

export function expand(text: string, now: Date = new Date()): string {
  const date = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;
  const time = `${p2(now.getHours())}:${p2(now.getMinutes())}`;
  const values: Record<string, string> = {
    date,
    time,
    datetime: `${date} ${time}`,
    weekday: now.toLocaleDateString("en-US", { weekday: "long" }),
  };
  return text.replace(/\{(date|time|datetime|weekday)\}/g, (_, k: string) => values[k]);
}
