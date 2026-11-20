//! Clipboard history. Kept in memory only, on purpose: nothing you copy is
//! ever written to disk, and copies flagged by password managers are skipped.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::winutil;

pub type History = Arc<Mutex<Vec<String>>>;

const MAX_ITEMS: usize = 50;
const MAX_LEN: usize = 20_000;

pub fn spawn(app: AppHandle, hist: History) {
    std::thread::Builder::new()
        .name("wheelie-clipboard".into())
        .spawn(move || {
            let mut cb = match arboard::Clipboard::new() {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("wheelie: clipboard unavailable: {e}");
                    return;
                }
            };
            let mut last_seq = 0u32;
            let mut last_text = String::new();
            loop {
                std::thread::sleep(Duration::from_millis(350));
                // Cheap change detection on Windows; 0 elsewhere = always read.
                let seq = winutil::clipboard_seq();
                if seq != 0 && seq == last_seq {
                    continue;
                }
                last_seq = seq;
                if winutil::clipboard_excluded() {
                    continue;
                }
                let Ok(text) = cb.get_text() else { continue };
                if text.trim().is_empty() || text == last_text || text.len() > MAX_LEN {
                    continue;
                }
                last_text = text.clone();
                {
                    let mut h = hist.lock().unwrap_or_else(|e| e.into_inner());
                    h.retain(|t| t != &text);
                    h.insert(0, text);
                    h.truncate(MAX_ITEMS);
                }
                let _ = app.emit("clipboard:update", ());
            }
        })
        .expect("spawn clipboard thread");
}
