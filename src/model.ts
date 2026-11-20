/**
 * Settings and ring-slot model. Pure data + functions (no DOM), so it is unit tested.
 *
 * The ring has 8 slots. A slot holds a tool from the library, a direct launcher
 * for an app / file / link, or nothing (empty slots are skipped by the ring).
 */

export const SLOT_COUNT = 8;
export const MIN_RING = 2;

export type Slot =
  | { kind: "tool"; id: string }
  | { kind: "launch"; id: string; name: string; target: string; icon: string; color?: string };
export type SlotList = (Slot | null)[];

export type IconColor = "auto" | "accent" | "colorful";
export type IconStyle = "line" | "duotone";
export type IconWeight = "thin" | "regular" | "bold";
export type Motion = "full" | "subtle" | "off";
export type VoiceModel = "tiny.en" | "base.en" | "tiny";

export interface Settings {
  theme: string;
  accent: string;
  iconColor: IconColor;
  iconStyle: IconStyle;
  iconWeight: IconWeight;
  motion: Motion;
  /** Slice opacity over the desktop, 0.55 to 1. */
  ringOpacity: number;
  keyboard: "alt+space" | "ctrl+alt+space" | "off";
  mouse: "middle" | "x1" | "x2" | "off";
  slots: SlotList;
  voiceModel: VoiceModel;
}

export const DEFAULT_TOOL_ORDER = ["calc", "clock", "notes", "todo", "clipboard", "units", "links", "apps"];

export const defaultSlots = (): SlotList => DEFAULT_TOOL_ORDER.map((id) => ({ kind: "tool", id }) as Slot);

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  accent: "#7c8cff",
  iconColor: "auto",
  iconStyle: "line",
  iconWeight: "regular",
  motion: "full",
  ringOpacity: 0.93,
  keyboard: "alt+space",
  mouse: "middle",
  slots: defaultSlots(),
  voiceModel: "tiny.en",
};

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

/** Keep only valid slots, exactly SLOT_COUNT long, no tool twice. */
export function normalizeSlots(raw: unknown, toolIds: readonly string[]): SlotList {
  const out: SlotList = [];
  const used = new Set<string>();
  if (Array.isArray(raw)) {
    for (const s of raw.slice(0, SLOT_COUNT)) {
      if (s && s.kind === "tool" && typeof s.id === "string" && toolIds.includes(s.id) && !used.has(s.id)) {
        used.add(s.id);
        out.push({ kind: "tool", id: s.id });
      } else if (s && s.kind === "launch" && typeof s.target === "string" && s.target.trim() && typeof s.id === "string") {
        out.push({
          kind: "launch",
          id: s.id,
          name: String(s.name ?? "").slice(0, 40) || "Launcher",
          target: s.target,
          icon: typeof s.icon === "string" ? s.icon : "rocket",
          color: typeof s.color === "string" ? s.color : undefined,
        });
      } else out.push(null);
    }
  }
  while (out.length < SLOT_COUNT) out.push(null);
  return ringSlots(out).length >= MIN_RING ? out : defaultSlots();
}

/**
 * Read stored settings of any age. Older versions stored `order` + `disabled`
 * lists instead of `slots`; those are converted so nothing is lost on upgrade.
 */
export function migrate(raw: unknown, toolIds: readonly string[], themeIds: readonly string[]): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  let slots: unknown = r.slots;
  if (!Array.isArray(slots) && Array.isArray(r.order)) {
    const disabled: string[] = Array.isArray(r.disabled) ? r.disabled : [];
    slots = (r.order as string[]).filter((id) => !disabled.includes(id)).map((id) => ({ kind: "tool", id }));
  }
  const d = DEFAULT_SETTINGS;
  return {
    theme: themeIds.includes(r.theme) ? r.theme : d.theme,
    accent: /^#[0-9a-f]{6}$/i.test(r.accent) ? r.accent : d.accent,
    iconColor: oneOf(r.iconColor, ["auto", "accent", "colorful"], d.iconColor),
    iconStyle: oneOf(r.iconStyle, ["line", "duotone"], d.iconStyle),
    iconWeight: oneOf(r.iconWeight, ["thin", "regular", "bold"], d.iconWeight),
    motion: oneOf(r.motion, ["full", "subtle", "off"], d.motion),
    ringOpacity: typeof r.ringOpacity === "number" ? Math.min(1, Math.max(0.55, r.ringOpacity)) : d.ringOpacity,
    keyboard: oneOf(r.keyboard, ["alt+space", "ctrl+alt+space", "off"], d.keyboard),
    mouse: oneOf(r.mouse, ["middle", "x1", "x2", "off"], d.mouse),
    slots: slots === undefined ? defaultSlots() : normalizeSlots(slots, toolIds),
    voiceModel: oneOf(r.voiceModel, ["tiny.en", "base.en", "tiny"], d.voiceModel),
  };
}

/** The slots the ring actually shows, in order. */
export const ringSlots = (slots: SlotList): Slot[] => slots.filter((s): s is Slot => s !== null);

export const slotKey = (s: Slot) => (s.kind === "tool" ? s.id : s.id);

/** Put a library tool in a slot. If it already sits in another slot the two swap. */
export function assignTool(slots: SlotList, index: number, toolId: string): SlotList {
  const next = [...slots];
  const from = next.findIndex((s) => s?.kind === "tool" && s.id === toolId);
  if (from === index) return next;
  if (from >= 0) next[from] = next[index];
  next[index] = { kind: "tool", id: toolId };
  return next;
}

export function assignLaunch(slots: SlotList, index: number, launch: Omit<Extract<Slot, { kind: "launch" }>, "kind">): SlotList {
  const next = [...slots];
  next[index] = { kind: "launch", ...launch };
  return next;
}

/** Empty a slot, unless that would leave the ring with fewer than MIN_RING entries. */
export function clearSlot(slots: SlotList, index: number): SlotList {
  if (!slots[index] || ringSlots(slots).length <= MIN_RING) return slots;
  const next = [...slots];
  next[index] = null;
  return next;
}

export function moveSlot(slots: SlotList, index: number, delta: -1 | 1): SlotList {
  const to = index + delta;
  if (to < 0 || to >= slots.length) return slots;
  const next = [...slots];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
