// Hide the console window in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod clip;
#[cfg(windows)]
mod hook_win;
mod notes;
mod notes_core;
#[allow(dead_code)]
mod trigger;
mod winutil;

use std::sync::mpsc::{self, Receiver};
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

use trigger::Event;

/// Logical size of the transparent overlay window. It never changes size: it is big enough
/// for the ring and for any tool panel, so panels can animate out of a slice inside it.
const OVERLAY_W: f64 = 700.0;
const OVERLAY_H: f64 = 700.0;
/// How far the ring reaches from its centre (logical px, including the hover lean).
const RING_REACH: f64 = 240.0;

#[derive(Default)]
struct Placement {
    /// Screen position of the overlay window's top-left corner.
    origin: (i32, i32),
}

#[derive(Default)]
struct AppState {
    placement: Mutex<Placement>,
    clip: clip::History,
}

#[derive(Serialize, Clone)]
struct Pt {
    x: i32,
    y: i32,
}

/// Sent to the UI when the overlay opens. Everything is in physical pixels, relative to the
/// window's top-left: where the ring centre is, and the bounds of the monitor it is on.
#[derive(Serialize, Clone)]
struct OpenInfo {
    x: i32,
    y: i32,
    bx0: i32,
    by0: i32,
    bx1: i32,
    by1: i32,
}

fn monitor_at(win: &WebviewWindow, x: i32, y: i32) -> Option<tauri::Monitor> {
    let mons = win.available_monitors().ok()?;
    mons.into_iter()
        .find(|m| {
            let p = m.position();
            let s = m.size();
            x >= p.x && x < p.x + s.width as i32 && y >= p.y && y < p.y + s.height as i32
        })
        .or_else(|| win.primary_monitor().ok().flatten())
}

/// Put the overlay window around `anchor`. If the ring would hang off the screen, the ring
/// centre is nudged inwards (and, when `warp` is set, the cursor with it, so the pointer
/// always starts in the hub). The window itself may extend past the screen edge: that part
/// is transparent and invisible anyway.
fn prepare(app: &AppHandle, anchor: (i32, i32), warp: bool) -> Option<OpenInfo> {
    let win = app.get_webview_window("main")?;
    let mon = monitor_at(&win, anchor.0, anchor.1)?;
    let scale = mon.scale_factor();
    let (w, h) = ((OVERLAY_W * scale).round() as i32, (OVERLAY_H * scale).round() as i32);
    let reach = (RING_REACH * scale).round() as i32;
    let (mp, ms) = (mon.position(), mon.size());
    let (mx1, my1) = (mp.x + ms.width as i32, mp.y + ms.height as i32);
    let cx = anchor.0.clamp(mp.x + reach, (mx1 - reach).max(mp.x + reach));
    let cy = anchor.1.clamp(mp.y + reach, (my1 - reach).max(mp.y + reach));
    if warp && (cx, cy) != anchor {
        winutil::set_cursor_pos(cx, cy);
    }
    let origin = (cx - w / 2, cy - h / 2);
    // Position first, then size, then position again: moving across monitors with a
    // different DPI can make Windows resize the window under us.
    let _ = win.set_position(PhysicalPosition::new(origin.0, origin.1));
    let _ = win.set_size(PhysicalSize::new(w as u32, h as u32));
    let _ = win.set_position(PhysicalPosition::new(origin.0, origin.1));
    app.state::<AppState>().placement.lock().unwrap().origin = origin;
    Some(OpenInfo { x: cx - origin.0, y: cy - origin.1, bx0: mp.x - origin.0, by0: mp.y - origin.1, bx1: mx1 - origin.0, by1: my1 - origin.1 })
}

fn focus_label(app: &AppHandle, label: &str) {
    if let Some(win) = app.get_webview_window(label) {
        let _ = app.run_on_main_thread(move || {
            winutil::with_input_attached(|| {
                let _ = win.set_focus();
            });
        });
    }
}

// ----- ring events from the input hooks ------------------------------------

fn handle(app: &AppHandle, ev: Event) {
    let Some(win) = app.get_webview_window("main") else { return };
    match ev {
        Event::Down { x, y } => {
            winutil::cancel_menu_activation();
            if let Some(info) = prepare(app, (x, y), true) {
                let _ = app.emit("ring:open", info);
                let _ = win.show();
            }
        }
        Event::Move { x, y } => {
            let o = app.state::<AppState>().placement.lock().unwrap().origin;
            let _ = app.emit("ring:move", Pt { x: x - o.0, y: y - o.1 });
        }
        Event::Up => {
            let _ = app.emit("ring:close", ());
        }
    }
}

/// Drains hook events, collapsing bursts of mouse moves into one.
fn pump(app: AppHandle, rx: Receiver<Event>) {
    let mut pending: Option<Event> = None;
    loop {
        let mut ev = match pending.take() {
            Some(e) => e,
            None => match rx.recv() {
                Ok(e) => e,
                Err(_) => return,
            },
        };
        let is_move = matches!(ev, Event::Move { .. });
        if is_move {
            while let Ok(next) = rx.try_recv() {
                if matches!(next, Event::Move { .. }) {
                    ev = next;
                } else {
                    pending = Some(next);
                    break;
                }
            }
        }
        handle(&app, ev);
        if is_move {
            std::thread::sleep(Duration::from_millis(6));
        }
    }
}

// ----- commands -------------------------------------------------------------

#[tauri::command]
fn set_trigger_config(keyboard: String, mouse: String) {
    let mut c = trigger::CONFIG.lock().unwrap_or_else(|e| e.into_inner());
    c.keyboard = trigger::Keyboard::parse(&keyboard);
    c.mouse = trigger::Mouse::parse(&mouse);
}

/// Show the overlay without the hold gesture (a timer went off, or a tool was opened from
/// elsewhere): centred on the monitor the cursor is on. Returns where the centre is.
#[tauri::command]
fn overlay_prepare(app: AppHandle) -> Option<OpenInfo> {
    let win = app.get_webview_window("main")?;
    let anchor = win
        .cursor_position()
        .ok()
        .and_then(|p| monitor_at(&win, p.x as i32, p.y as i32))
        .or_else(|| win.primary_monitor().ok().flatten())
        .map(|m| {
            let (p, s) = (m.position(), m.size());
            (p.x + s.width as i32 / 2, p.y + s.height as i32 / 2)
        })?;
    let info = prepare(&app, anchor, false)?;
    let _ = win.show();
    focus_label(&app, "main");
    Some(info)
}

#[tauri::command]
fn focus_window(app: AppHandle) {
    focus_label(&app, "main");
}

#[tauri::command]
fn hide_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
}

#[tauri::command]
fn open_studio(app: AppHandle) {
    show_studio(&app);
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn autostart_get(app: AppHandle) -> Result<bool, String> {
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn autostart_set(app: AppHandle, on: bool) -> Result<(), String> {
    let m = app.autolaunch();
    if on { m.enable() } else { m.disable() }.map_err(|e| e.to_string())
}

#[tauri::command]
fn clipboard_history(state: tauri::State<AppState>) -> Vec<String> {
    state.clip.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[tauri::command]
fn clipboard_clear(state: tauri::State<AppState>) {
    state.clip.lock().unwrap_or_else(|e| e.into_inner()).clear();
}

/// Put `text` on the clipboard, hide Wheelie, and press Ctrl+V in whatever
/// window gets focus back.
#[tauri::command]
fn paste_text(app: AppHandle, text: String) {
    std::thread::spawn(move || {
        if let Ok(mut cb) = arboard::Clipboard::new() {
            let _ = cb.set_text(text);
        }
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.hide();
        }
        std::thread::sleep(Duration::from_millis(120));
        winutil::send_paste();
    });
}

/// Open a URL, file or app with the OS default handler (ShellExecute on Windows).
#[tauri::command]
fn open_target(target: String) -> Result<(), String> {
    let t = target.trim();
    if t.is_empty() {
        return Err("empty target".into());
    }
    open::that_detached(t).map_err(|e| e.to_string())
}

// ----- the Wheelie app window, tray, first run ---------------------------------

fn show_studio(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("studio") {
        let _ = win.show();
        let _ = win.unminimize();
        focus_label(app, "studio");
    }
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Wheelie", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Wheelie", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;
    // Embedded explicitly: without an icon the tray entry is invisible and Wheelie can't be quit.
    let tray = TrayIconBuilder::new()
        .icon(tauri::include_image!("icons/32x32.png"))
        .tooltip("Wheelie")
        .menu(&menu)
        .on_menu_event(|app, ev| match ev.id.as_ref() {
            "open" => show_studio(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, ev| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = ev {
                show_studio(tray.app_handle());
            }
        });
    tray.build(app)?;
    Ok(())
}

/// True exactly once, the first time Wheelie ever runs on this PC.
fn first_run(app: &tauri::App) -> bool {
    let Ok(dir) = app.path().app_data_dir() else { return false };
    let marker = dir.join("first-run-done");
    if marker.exists() {
        return false;
    }
    let _ = std::fs::create_dir_all(&dir);
    let _ = std::fs::write(&marker, b"1");
    true
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Starting Wheelie again (from the Start menu, say) brings the app forward.
            show_studio(app);
        }))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--autostart"])))
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            set_trigger_config,
            overlay_prepare,
            focus_window,
            hide_window,
            open_studio,
            quit_app,
            app_version,
            autostart_get,
            autostart_set,
            clipboard_history,
            clipboard_clear,
            paste_text,
            open_target,
            notes::notes_dir,
            notes::notes_list,
            notes::notes_read,
            notes::notes_write,
            notes::notes_delete,
        ])
        .on_window_event(|window, event| {
            // Closing a window (Alt+F4, the X) hides it: Wheelie lives in the tray and keeps
            // the ring available. Quit is in the tray menu and in the app's settings.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            build_tray(app)?;

            let (tx, rx) = mpsc::channel::<Event>();
            #[cfg(windows)]
            hook_win::spawn(tx);
            #[cfg(not(windows))]
            drop(tx);
            let handle = app.handle().clone();
            std::thread::Builder::new()
                .name("wheelie-pump".into())
                .spawn(move || pump(handle, rx))
                .expect("spawn pump thread");

            clip::spawn(app.handle().clone(), app.state::<AppState>().clip.clone());

            // First ever launch: start with Windows from now on (changeable in the app), and
            // greet the user with the app. After that, a start at login stays out of the way in
            // the tray; starting Wheelie by hand opens the app.
            let first = first_run(app);
            if first {
                let _ = app.autolaunch().enable();
            }
            if first || !std::env::args().any(|a| a == "--autostart") {
                show_studio(app.handle());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Wheelie");
}
