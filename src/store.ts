/** Persistent key/value store (localStorage), tolerant of it being unavailable. */
const PREFIX = "wheelie:";

export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: keep going without persistence */
    }
  },
};

export interface Settings {
  theme: "dark" | "light" | "tinted";
  accent: string;
  keyboard: "alt+space" | "ctrl+alt+space" | "off";
  mouse: "middle" | "x1" | "x2" | "off";
  /** Tool ids in ring order. */
  order: string[];
  /** Tool ids hidden from the ring. */
  disabled: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  accent: "#7c8cff",
  keyboard: "alt+space",
  mouse: "middle",
  order: ["calc", "clock", "notes", "todo", "clipboard", "units", "links", "apps"],
  disabled: [],
};

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...store.get<Partial<Settings>>("settings", {}) };
}
export function saveSettings(s: Settings): void {
  store.set("settings", s);
}
