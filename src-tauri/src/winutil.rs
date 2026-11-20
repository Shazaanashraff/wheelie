//! Small Windows-only helpers, with no-op fallbacks elsewhere so the rest of
//! the app compiles (and the frontend can be developed) on any OS.

#[cfg(windows)]
mod imp {
    use std::time::Duration;
    use windows_sys::Win32::System::DataExchange::{
        GetClipboardSequenceNumber, IsClipboardFormatAvailable, RegisterClipboardFormatW,
    };
    use windows_sys::Win32::System::Threading::{AttachThreadInput, GetCurrentThreadId};
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP,
        VK_CONTROL, VK_MENU, VK_SHIFT,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowThreadProcessId, SetCursorPos,
    };

    /// Windows only lets the foreground app take focus. Temporarily sharing
    /// input state with the foreground thread makes `SetForegroundWindow`
    /// (inside `set_focus`) succeed. Must run on the thread that calls `f`.
    pub fn with_input_attached<F: FnOnce()>(f: F) {
        unsafe {
            let fg = GetForegroundWindow();
            let cur = GetCurrentThreadId();
            let fg_thread = if fg.is_null() { 0 } else { GetWindowThreadProcessId(fg, std::ptr::null_mut()) };
            let attached = fg_thread != 0 && fg_thread != cur && AttachThreadInput(cur, fg_thread, 1) != 0;
            f();
            if attached {
                AttachThreadInput(cur, fg_thread, 0);
            }
        }
    }

    /// Send Ctrl+V to whatever window now has focus.
    pub fn send_paste() {
        unsafe {
            // If the user is still holding Alt/Shift from the trigger, wait,
            // otherwise the target app would see Ctrl+Alt+V.
            for _ in 0..80 {
                if GetAsyncKeyState(VK_MENU as i32) < 0 || GetAsyncKeyState(VK_SHIFT as i32) < 0 {
                    std::thread::sleep(Duration::from_millis(15));
                } else {
                    break;
                }
            }
            let key = |vk: u16, up: bool| INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk,
                        wScan: 0,
                        dwFlags: if up { KEYEVENTF_KEYUP } else { 0 },
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            let inputs = [key(VK_CONTROL, false), key(0x56, false), key(0x56, true), key(VK_CONTROL, true)];
            SendInput(inputs.len() as u32, inputs.as_ptr(), std::mem::size_of::<INPUT>() as i32);
        }
    }

    /// Press and release an unassigned key. Because we swallow Space while Alt is
    /// held, the foreground app would otherwise see a bare Alt tap and highlight
    /// its menu bar. A key pressed during the Alt hold cancels that.
    pub fn cancel_menu_activation() {
        unsafe {
            let key = |up: bool| INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: 0xE8, // unassigned virtual key
                        wScan: 0,
                        dwFlags: if up { KEYEVENTF_KEYUP } else { 0 },
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            };
            let inputs = [key(false), key(true)];
            SendInput(inputs.len() as u32, inputs.as_ptr(), std::mem::size_of::<INPUT>() as i32);
        }
    }

    pub fn clipboard_seq() -> u32 {
        unsafe { GetClipboardSequenceNumber() }
    }

    pub fn set_cursor_pos(x: i32, y: i32) {
        unsafe {
            SetCursorPos(x, y);
        }
    }

    /// Password managers mark their clipboard writes with this format so that
    /// clipboard history tools skip them.
    pub fn clipboard_excluded() -> bool {
        unsafe {
            let name: Vec<u16> = "ExcludeClipboardContentFromMonitorProcessing\0".encode_utf16().collect();
            let fmt = RegisterClipboardFormatW(name.as_ptr());
            fmt != 0 && IsClipboardFormatAvailable(fmt) != 0
        }
    }
}

#[cfg(not(windows))]
mod imp {
    pub fn with_input_attached<F: FnOnce()>(f: F) {
        f()
    }
    pub fn send_paste() {}
    pub fn cancel_menu_activation() {}
    pub fn clipboard_seq() -> u32 {
        0
    }
    pub fn set_cursor_pos(_x: i32, _y: i32) {}
    pub fn clipboard_excluded() -> bool {
        false
    }
}

pub use imp::*;
