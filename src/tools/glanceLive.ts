/** The live side of glance.ts: real store, real clock, and the notes and clipboard fetched when the ring opens. */
import { invoke } from "../core/bridge.ts";
import type { Slot } from "../core/model.ts";
import { store } from "../core/store.ts";
import { launchGlance, toolGlance, type Extras, type Glance } from "./glance.ts";

let extras: Extras = {};

/** Fetch what the store does not hold (notes, clipboard history). Never throws. */
export async function refreshExtras(): Promise<void> {
  const next: Extras = {};
  const [notes, clips] = await Promise.all([
    invoke<{ title: string }[]>("notes_list").catch(() => null),
    invoke<string[]>("clipboard_history").catch(() => null),
  ]);
  if (notes) next.notes = { count: notes.length, latest: notes[0]?.title ?? "" };
  if (clips?.[0]) next.clip = clips[0];
  extras = next;
}

/** The glance for whatever sits in a slot, from the real store and clock. */
export function slotGlance(slot: Slot, toolName: string): Glance {
  return slot.kind === "launch" ? launchGlance(slot.name, slot.target) : toolGlance(slot.id, toolName, store, new Date(), extras);
}
