/**
 * Loading and saving Settings. Kept apart from store.ts so the tools (which
 * use store.ts) and the tool registry (which lists the tools) don't import
 * each other in a circle: the registry tells us which tool ids exist.
 */
import { DEFAULT_TOOL_ORDER, migrate, type Settings } from "./model.ts";
import { store } from "./store.ts";
import { THEME_IDS } from "./themes.ts";

let toolIds: readonly string[] = DEFAULT_TOOL_ORDER;
export const registerToolIds = (ids: readonly string[]) => {
  toolIds = ids;
};

export const loadSettings = (): Settings => migrate(store.get<unknown>("settings", {}), toolIds, THEME_IDS);
export const saveSettings = (s: Settings): void => store.set("settings", s);
