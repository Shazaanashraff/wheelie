/** Pure text helpers for dictation. */

/** Whisper emits markers like [BLANK_AUDIO] or (silence) for quiet audio; drop them. */
export function cleanTranscript(raw: string): string {
  return raw
    .replace(/\[(?:\s*(?:blank[_ ]audio|silence|music|noise|inaudible)\s*)\]/gi, " ")
    .replace(/\((?:\s*(?:blank[_ ]audio|silence|music|noise|inaudible)\s*)\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Join dictated text onto what is already there with sensible spacing. */
export function joinDictation(before: string, text: string): string {
  if (!text) return "";
  if (before === "" || /\s$/.test(before)) return text;
  return " " + text;
}

export function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
