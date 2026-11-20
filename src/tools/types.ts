export interface ToolCtx {
  /** Hide Wheelie entirely. */
  hide(): void;
  /** Re-read and re-apply settings (after the settings panel changed something). */
  settingsChanged(): void;
  /**
   * Stop the panel closing when it loses focus (e.g. while the OS shows a
   * microphone prompt or the colour eyedropper is active).
   */
  keepOpen(on: boolean): void;
}

export interface Tool {
  id: string;
  name: string;
  /** One line shown in the tool library. */
  desc: string;
  /** Logical panel size [width, height] in CSS px. */
  size: [number, number];
  /** Build the panel body. May return a cleanup function. */
  mount(root: HTMLElement, ctx: ToolCtx): void | (() => void);
}
