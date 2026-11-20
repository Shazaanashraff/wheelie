// Hide the console window in release builds on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod clip;
#[cfg(windows)]
mod hook_win;
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

use trigger::Event;

/// Logical size of the transparent window while the ring is showing.
const RING_SIZE: f64 = 560.0;

#[derive(Default)]
struct Placement {
    /// Screen position (physical px) the window is centred on.
    anchor: (i32, i32),
    /// Screen position of the window's top-left corner.
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

/// Resize the window to `logical` size and centre it on `anchor`, clamped to
/// the monitor so the ring is never cut off at a screen edge.
/// Returns the window's new top-left and its physical size.
fn place(win: &WebviewWindow, anchor: (i32, i32), logical: (f64, f64)) -> Option<((i32, i32), (i32, i32))> {
    let mon = monitor_at(win, anchor.0, anchor.1)?;
    let scale = mon.scale_factor();
    let w = (logical.0 * scale).round() as i32;
    let h = (logical.1 * scale).round() as i32;
    let (mp, ms) = (mon.position(), mon.size());
    let x = (anchor.0 - w / 2).clamp(mp.x, (mp.x + ms.width as i32 - w).max(mp.x));
    let y = (anchor.1 - h / 2).clamp(mp.y, (mp.y + ms.height as i32 - h).max(mp.y));
    // Position first, then size, then position again: moving across monitors
    // with different DPI can make Windows resize the window under us.
    let _ = win.set_position(PhysicalPosition::new(x, y));
    let _ = win.set_size(PhysicalSize::new(w as u32, h as u32));
    let _ = win.set_position(PhysicalPosition::new(x, y));
    Some(((x, y), (w, h)))
}

fn focus(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
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
    let state = app.state::<AppState>();
    match ev {
        Event::Down { x, y } => {
            winutil::cancel_menu_activation();
            if let Some((origin, size)) = place(&win, (x, y), (RING_SIZE, RING_SIZE)) {
                // Near a screen edge the window gets clamped onto the screen. Keep the
                // whole ring visible by centring it in the window and moving the
                // cursor to its centre, so the pointer always starts in the hub.
                let centre = (origin.0 + size.0 / 2, origin.1 + size.1 / 2);
                if centre != (x, y) {
                    winutil::set_cursor_pos(centre.0, centre.1);
                }
                *state.placement.lock().unwrap() = Placement { anchor: centre, origin };
                let _ = app.emit("ring:open", Pt { x: size.0 / 2, y: size.1 / 2 });
                let _ = win.show();
            }
        }
        Event::Move { x, y } => {
            let o = state.placement.lock().unwrap().origin;
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

/// Switch from the ring to a tool panel of the given logical size.
#[tauri::command]
fn enter_panel(app: AppHandle, w: f64, h: f64) {
    let Some(win) = app.get_webview_window("main") else { return };
    let state = app.state::<AppState>();
    let anchor = state.placement.lock().unwrap().anchor;
    if let Some((origin, _)) = place(&win, anchor, (w, h)) {
        state.placement.lock().unwrap().origin = origin;
    }
    let _ = win.show();
    focus(&app);
}

#[tauri::command]
fn focus_window(app: AppHandle) {
    focus(&app);
}

#[tauri::command]
fn hide_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
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

// ----- tray / settings --------------------------------------------------------

fn open_settings(app: &AppHandle) {
    let Some(win) = app.get_webview_window("main") else { return };
    if let Ok(Some(m)) = win.primary_monitor() {
        let (p, s) = (m.position(), m.size());
        let anchor = (p.x + s.width as i32 / 2, p.y + s.height as i32 / 2);
        app.state::<AppState>().placement.lock().unwrap().anchor = anchor;
    }
    let _ = app.emit("app:open-tool", "settings");
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Wheelie", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings, &quit])?;
    // Embedded explicitly: without an icon the tray entry is invisible and Wheelie can't be quit.
    let tray = TrayIconBuilder::new()
        .icon(tauri::include_image!("icons/32x32.png"))
        .tooltip("Wheelie")
        .menu(&menu)
        .on_menu_event(|app, ev| match ev.id.as_ref() {
            "settings" => open_settings(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, ev| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = ev
            {
                open_settings(tray.app_handle());
            }
        });
    tray.build(app)?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            open_settings(app);
        }))
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            set_trigger_config,
            enter_panel,
            focus_window,
            hide_window,
            clipboard_history,
            clipboard_clear,
            paste_text,
            open_target,
        ])
        .on_window_event(|window, event| {
            // Alt+F4 etc. must hide, not quit: Wheelie lives in the tray.
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
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Wheelie");
}
