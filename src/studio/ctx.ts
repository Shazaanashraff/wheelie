import type { Settings } from "../model.ts";

export type PageId = "home" | "appearance" | "ring" | "library" | "voice" | "general";

export interface StudioCtx {
  readonly settings: Settings;
  /** Merge changes, save them, apply them here, and (through storage events) in the overlay. */
  update(patch: Partial<Settings>): void;
  go(page: PageId): void;
}

export interface Page {
  el: HTMLElement;
  destroy?(): void;
}
