import { invoke } from "../bridge.ts";
import { h, icon } from "../dom.ts";
import { ic, ICONS } from "../icons.ts";
import { loadSettings } from "../settingsStore.ts";
import { Dictation } from "../voice/dictation.ts";
import { joinDictation } from "../voice/dictationText.ts";
import type { Tool } from "./types.ts";

interface Meta {
  id: string;
  title: string;
  preview: string;
  updated: number;
}

/** "Just now", "12 min ago", "Yesterday", "3 Mar". */
export function relTime(ms: number, now = Date.now()): string {
  const diff = now - ms;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  const d = new Date(ms);
  const today = new Date(now);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (days === 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

const newId = () => "n-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** A button that asks for a second click before doing something destructive. */
function confirmButton(label: string, onConfirm: () => void, cls: string, content?: Node): HTMLButtonElement {
  let armed = false;
  let timer: number | undefined;
  const b = h("button", { class: cls, title: label });
  const set = () => {
    b.classList.toggle("armed", armed);
    b.replaceChildren(armed ? "Delete?" : content ?? label);
  };
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!armed) {
      armed = true;
      set();
      timer = window.setTimeout(() => ((armed = false), set()), 2500);
      return;
    }
    clearTimeout(timer);
    onConfirm();
  });
  set();
  return b;
}

export const notes: Tool = {
  id: "notes",
  name: "Notes",
  desc: "Notes saved as text files, plus voice notes",
  size: [460, 540],
  mount(root, ctx) {
    let flushNow: (() => Promise<void>) | null = null;
    let dictation: Dictation | null = null;
    let dirPath = "";
    let disposed = false;

    const leaveEditor = () => {
      dictation?.dispose();
      dictation = null;
    };

    // ---------- history ----------
    async function showHistory(autoNew = false) {
      leaveEditor();
      if (flushNow) await flushNow();
      flushNow = null;
      if (disposed) return;
      let metas: Meta[] = [];
      try {
        metas = await invoke<Meta[]>("notes_list");
      } catch (e) {
        root.replaceChildren(h("div", { class: "empty" }, `Couldn't read notes: ${e}`));
        return;
      }
      if (!dirPath) dirPath = await invoke<string>("notes_dir").catch(() => "");
      if (disposed) return;
      // First run: nothing to browse yet, so go straight to writing.
      if (autoNew && metas.length === 0) return void openNote(newId(), true);

      const search = h("input", { class: "input", placeholder: "Search your notes", autocomplete: "off" });
      const list = h("div", { class: "note-list stg" });
      const count = h("span", {});

      const render = () => {
        const q = search.value.trim().toLowerCase();
        const shown = metas.filter((m) => !q || m.title.toLowerCase().includes(q) || m.preview.toLowerCase().includes(q));
        count.textContent = `${metas.length} note${metas.length === 1 ? "" : "s"}`;
        list.replaceChildren(
          ...shown.map((m) =>
            h(
              "div",
              { class: "note-item", tabIndex: 0, onClick: () => openNote(m.id), onKeydown: (e: KeyboardEvent) => e.key === "Enter" && openNote(m.id) },
              h(
                "div",
                { class: "note-main" },
                h("div", { class: "note-title" }, m.title || "Untitled"),
                m.preview ? h("div", { class: "note-preview" }, m.preview) : null,
              ),
              h(
                "div",
                { class: "note-side" },
                h("span", { class: "note-date" }, relTime(m.updated)),
                confirmButton(
                  "Delete note",
                  async () => {
                    await invoke("notes_delete", { id: m.id });
                    metas = metas.filter((x) => x.id !== m.id);
                    render();
                  },
                  "icon-btn note-del",
                  icon(ICONS.trash, 15),
                ),
              ),
            ),
          ),
        );
        if (!shown.length) list.append(h("div", { class: "empty" }, metas.length ? "No notes match." : "No notes yet. Press New, or the mic to speak one."));
      };
      search.addEventListener("input", render);

      root.replaceChildren(
        h(
          "div",
          { class: "pad row" },
          search,
          h("button", { class: "icon-btn voice-new anim-host", title: "New voice note", onClick: () => openNote(newId(), true, true) }, ic("voice", 19)),
          h("button", { class: "btn primary", onClick: () => openNote(newId(), true) }, icon(ICONS.plus, 15), "New"),
        ),
        list,
        h(
          "div",
          { class: "foot" },
          count,
          h("button", { class: "link", title: dirPath, textContent: "Open notes folder", onClick: () => dirPath && void invoke("open_target", { target: dirPath }) }),
        ),
      );
      render();
      search.focus();
    }

    // ---------- editor ----------
    async function openNote(id: string, isNew = false, startVoice = false) {
      leaveEditor();
      let text = "";
      if (!isNew) {
        try {
          text = await invoke<string>("notes_read", { id });
        } catch (e) {
          root.replaceChildren(h("div", { class: "empty" }, `Couldn't open that note: ${e}`));
          return;
        }
      }
      if (disposed) return;

      let saved = text;
      let touched = !isNew;
      let timer: number | undefined;
      const area = h("textarea", { class: "note-area", placeholder: "Start typing, or press the mic and speak. Saved to a text file as you go.", spellcheck: true });
      area.value = text;
      const status = h("span", { class: "save-status" }, isNew ? "" : "Saved");

      const save = async () => {
        clearTimeout(timer);
        const now = area.value;
        if (now === saved) return;
        if (now.trim() === "" && !touched) return; // never create empty files
        try {
          await invoke("notes_write", { id, text: now });
          saved = now;
          touched = true;
          status.textContent = "Saved";
          status.classList.remove("err");
        } catch (e) {
          status.textContent = `Not saved: ${e}`;
          status.classList.add("err");
        }
      };
      /** Persist, and drop the file if the note ended up empty. */
      const finish = async () => {
        await save();
        if (area.value.trim() === "" && touched) await invoke("notes_delete", { id }).catch(() => {});
      };
      flushNow = finish;

      const queueSave = () => {
        status.textContent = "Saving…";
        status.classList.remove("err");
        clearTimeout(timer);
        timer = window.setTimeout(save, 400);
      };
      area.addEventListener("input", queueSave);
      area.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === "s") {
          e.preventDefault();
          void save();
        }
      });

      // Dictated text goes in at the cursor (or the end), then saves like typing.
      const dict = new Dictation({
        model: () => loadSettings().voiceModel,
        keepOpen: ctx.keepOpen,
        onText: (t) => {
          const atEnd = !area.selectionStart && area.selectionStart !== 0 ? area.value.length : area.selectionStart!;
          const before = area.value.slice(0, atEnd);
          const piece = joinDictation(before, t);
          area.setRangeText(piece, atEnd, area.selectionEnd ?? atEnd, "end");
          area.dispatchEvent(new Event("input"));
          area.focus();
          area.scrollTop = area.scrollHeight;
        },
      });
      dictation = dict;

      root.replaceChildren(
        h(
          "div",
          { class: "note-bar" },
          h("button", { class: "btn back", onClick: () => void showHistory() }, "‹ All notes"),
          h("span", { class: "grow" }),
          status,
          dict.button,
          h("button", { class: "icon-btn", title: "Copy note", onClick: () => navigator.clipboard?.writeText(area.value).catch(() => {}) }, icon(ICONS.clipboard, 16)),
          confirmButton(
            "Delete note",
            async () => {
              clearTimeout(timer);
              area.value = "";
              saved = "";
              await invoke("notes_delete", { id });
              flushNow = null;
              void showHistory();
            },
            "icon-btn",
            icon(ICONS.trash, 16),
          ),
        ),
        dict.bar,
        area,
      );
      area.focus();
      if (startVoice) void dict.start();
    }

    void showHistory(true);

    return () => {
      disposed = true;
      leaveEditor();
      void flushNow?.(); // never lose the last keystrokes when the panel closes
    };
  },
};
