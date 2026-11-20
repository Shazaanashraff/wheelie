//! Tauri commands for the Notes tool. All storage logic lives in `notes_core`.

use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::notes_core as core;

#[derive(Serialize)]
pub struct NoteMeta {
    id: String,
    title: String,
    preview: String,
    updated: u64,
}

/// `Documents\Wheelie Notes`: somewhere easy to find, back up and sync.
fn dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .document_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| e.to_string())?;
    let d = base.join("Wheelie Notes");
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

#[tauri::command]
pub fn notes_dir(app: AppHandle) -> Result<String, String> {
    Ok(dir(&app)?.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn notes_list(app: AppHandle) -> Result<Vec<NoteMeta>, String> {
    Ok(core::list(&dir(&app)?)?
        .into_iter()
        .map(|m| NoteMeta { id: m.id, title: m.title, preview: m.preview, updated: m.updated })
        .collect())
}

#[tauri::command]
pub fn notes_read(app: AppHandle, id: String) -> Result<String, String> {
    core::read(&dir(&app)?, &id)
}

#[tauri::command]
pub fn notes_write(app: AppHandle, id: String, text: String) -> Result<(), String> {
    core::write(&dir(&app)?, &id, &text)
}

#[tauri::command]
pub fn notes_delete(app: AppHandle, id: String) -> Result<(), String> {
    core::delete(&dir(&app)?, &id)
}
