export interface ToolCtx {
  /** Hide Wheelie entirely. */
  hide(): void;
  /** Re-read settings (after the settings panel changed something). */
  settingsChanged(): void;
}

export interface Tool {
  id: string;
  name: string;
  /** Logical panel size [width, height] in CSS px. */
  size: [number, number];
  /** Build the panel body. May return a cleanup function. */
  mount(root: HTMLElement, ctx: ToolCtx): void | (() => void);
}
