/** The tool library: everything that can be put in a ring slot. */
import type { Slot } from "../core/model.ts";
import type { Slice } from "../overlay/ring.ts";
import { registerToolIds } from "../core/settingsStore.ts";
import { apps } from "./apps.ts";
import { calc } from "./calc.ts";
import { clipboard } from "./clipboard.ts";
import { clock } from "./clock.ts";
import { colors } from "./colors.ts";
import { links } from "./links.ts";
import { notes } from "./notes.ts";
import { passwords } from "./passwords.ts";
import { snippets } from "./snippets.ts";
import { todo } from "./todo.ts";
import type { Tool } from "./types.ts";
import { units } from "./units.ts";
import { worldclock } from "./worldclock.ts";

export const LIBRARY: Tool[] = [calc, clock, notes, todo, clipboard, units, links, apps, colors, snippets, passwords, worldclock];
export const TOOL_IDS = LIBRARY.map((t) => t.id);
registerToolIds(TOOL_IDS);

export const toolById = (id: string): Tool | undefined => LIBRARY.find((t) => t.id === id);

/** What the ring draws for a slot. Returns null for a tool that no longer exists. */
export function sliceOf(slot: Slot): Slice | null {
  if (slot.kind === "launch") return { id: slot.id, name: slot.name, icon: slot.icon };
  const t = toolById(slot.id);
  return t ? { id: t.id, name: t.name, icon: t.id } : null;
}
