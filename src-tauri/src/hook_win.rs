//! Windows low-level keyboard + mouse hooks.
//!
//! Thin OS glue only: every decision lives in `trigger::Machine`. The hook
//! callbacks must return quickly, so they just push events down a channel
//! that the app's worker thread drains.

use std::sync::mpsc::Sender;
use std::sync::{Mutex, OnceLock};

use windows_sys::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_CONTROL};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetCursorPos, GetMessageW, SetWindowsHookExW,
    TranslateMessage, HC_ACTION, KBDLLHOOKSTRUCT, LLKHF_ALTDOWN, LLKHF_INJECTED, LLMHF_INJECTED,
    MSG, MSLLHOOKSTRUCT, WH_KEYBOARD_LL, WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP, WM_MBUTTONDOWN,
    WM_MBUTTONUP, WM_MOUSEMOVE, WM_SYSKEYDOWN, WM_SYSKEYUP, WM_XBUTTONDOWN, WM_XBUTTONUP,
};

use crate::trigger::{Event, KeyInput, Machine, MouseBtn, CONFIG};

static MACHINE: Mutex<Machine> = Mutex::new(Machine::new());
static TX: OnceLock<Sender<Event>> = OnceLock::new();

fn dispatch(out: crate::trigger::Out) -> bool {
    if let (Some(ev), Some(tx)) = (out.event, TX.get()) {
        let _ = tx.send(ev);
    }
    out.swallow
}

fn cfg() -> crate::trigger::Config {
    *CONFIG.lock().unwrap_or_else(|e| e.into_inner())
}

fn machine() -> std::sync::MutexGuard<'static, Machine> {
    MACHINE.lock().unwrap_or_else(|e| e.into_inner())
}

unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32 {
        let info = &*(lparam as *const KBDLLHOOKSTRUCT);
        // Ignore events we injected ourselves (the paste shortcut).
        if info.flags & LLKHF_INJECTED == 0 {
            let msg = wparam as u32;
            let down = msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN;
            let up = msg == WM_KEYUP || msg == WM_SYSKEYUP;
            if down || up {
                let mut pt = std::mem::zeroed();
                GetCursorPos(&mut pt);
                let out = machine().key(
                    &cfg(),
                    KeyInput {
                        vk: info.vkCode,
                        up,
                        alt: info.flags & LLKHF_ALTDOWN != 0,
                        ctrl: GetAsyncKeyState(VK_CONTROL as i32) < 0,
                        cursor: (pt.x, pt.y),
                    },
                );
                if dispatch(out) {
                    return 1;
                }
            }
        }
    }
    CallNextHookEx(std::ptr::null_mut(), code, wparam, lparam)
}

unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32 {
        let info = &*(lparam as *const MSLLHOOKSTRUCT);
        if info.flags & LLMHF_INJECTED == 0 {
            let pos = (info.pt.x, info.pt.y);
            let xbtn = || match (info.mouseData >> 16) & 0xFFFF {
                1 => Some(MouseBtn::X1),
                2 => Some(MouseBtn::X2),
                _ => None,
            };
            let out = match wparam as u32 {
                WM_MOUSEMOVE => Some(machine().mouse_move(pos)),
                WM_MBUTTONDOWN => Some(machine().mouse_button(&cfg(), MouseBtn::Middle, false, pos)),
                WM_MBUTTONUP => Some(machine().mouse_button(&cfg(), MouseBtn::Middle, true, pos)),
                WM_XBUTTONDOWN => xbtn().map(|b| machine().mouse_button(&cfg(), b, false, pos)),
                WM_XBUTTONUP => xbtn().map(|b| machine().mouse_button(&cfg(), b, true, pos)),
                _ => None,
            };
            if let Some(out) = out {
                if dispatch(out) {
                    return 1;
                }
            }
        }
    }
    CallNextHookEx(std::ptr::null_mut(), code, wparam, lparam)
}

/// Install both hooks on a dedicated thread (hooks need a message loop).
pub fn spawn(tx: Sender<Event>) {
    let _ = TX.set(tx);
    std::thread::Builder::new()
        .name("wheelie-hooks".into())
        .spawn(|| unsafe {
            let hmod = GetModuleHandleW(std::ptr::null());
            let kb = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), hmod, 0);
            let ms = SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), hmod, 0);
            if kb.is_null() || ms.is_null() {
                eprintln!("wheelie: failed to install input hooks");
                return;
            }
            let mut msg: MSG = std::mem::zeroed();
            while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        })
        .expect("spawn hook thread");
}
