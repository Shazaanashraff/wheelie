//! Notes as plain `.txt` files in one folder. No serde/tauri here so the file
//! logic can be unit tested anywhere; `notes.rs` wraps it as app commands.
//!
//! One note = one file named `<id>.txt`. The title is simply the first line.
//! You can open, edit, back up or sync the folder with any other tool.

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Meta {
    pub id: String,
    pub title: String,
    pub preview: String,
    /// Last modified, milliseconds since the Unix epoch.
    pub updated: u64,
}

/// Ids become file names, so only allow a safe character set (blocks `..`, `/`, `\`, `:` ...).
pub fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn truncate(s: &str, n: usize) -> String {
    if s.chars().count() <= n {
        s.to_string()
    } else {
        s.chars().take(n).collect::<String>() + "…"
    }
}

/// First non-empty line is the title; the next few lines are the preview.
pub fn title_and_preview(text: &str) -> (String, String) {
    let text = text.trim_start_matches('\u{feff}');
    let mut lines = text.lines().map(str::trim).filter(|l| !l.is_empty());
    let title = lines.next().map(|l| truncate(l, 60)).unwrap_or_default();
    let preview = truncate(&lines.take(3).collect::<Vec<_>>().join(" "), 140);
    (title, preview)
}

fn es(e: std::io::Error) -> String {
    e.to_string()
}

fn file(dir: &Path, id: &str) -> Result<PathBuf, String> {
    if valid_id(id) {
        Ok(dir.join(format!("{id}.txt")))
    } else {
        Err("invalid note id".into())
    }
}

/// All notes, newest first.
pub fn list(dir: &Path) -> Result<Vec<Meta>, String> {
    let mut out = Vec::new();
    for entry in fs::read_dir(dir).map_err(es)? {
        let entry = entry.map_err(es)?;
        let path = entry.path();
        if path.extension().and_then(|x| x.to_str()) != Some("txt") {
            continue;
        }
        let Some(id) = path.file_stem().and_then(|s| s.to_str()) else { continue };
        if !valid_id(id) {
            continue; // someone else's file in the folder: leave it alone
        }
        let md = entry.metadata().map_err(es)?;
        if !md.is_file() {
            continue;
        }
        let updated = md
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        // Only the start of each file is needed for the list.
        let mut buf = Vec::new();
        fs::File::open(&path).map_err(es)?.take(8192).read_to_end(&mut buf).map_err(es)?;
        let (title, preview) = title_and_preview(&String::from_utf8_lossy(&buf));
        out.push(Meta { id: id.to_string(), title, preview, updated });
    }
    out.sort_by(|a, b| b.updated.cmp(&a.updated).then_with(|| a.id.cmp(&b.id)));
    Ok(out)
}

pub fn read(dir: &Path, id: &str) -> Result<String, String> {
    let bytes = fs::read(file(dir, id)?).map_err(es)?;
    // Tolerate files edited elsewhere (BOM, odd encodings) instead of failing.
    Ok(String::from_utf8_lossy(&bytes).trim_start_matches('\u{feff}').to_string())
}

/// Write via a temp file + rename so a crash mid-save can't leave a half-written note.
pub fn write(dir: &Path, id: &str, text: &str) -> Result<(), String> {
    let path = file(dir, id)?;
    let tmp = dir.join(format!("{id}.txt.tmp"));
    fs::write(&tmp, text).map_err(es)?;
    fs::rename(&tmp, &path).map_err(es)
}

pub fn delete(dir: &Path, id: &str) -> Result<(), String> {
    match fs::remove_file(file(dir, id)?) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(es(e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, SystemTime};

    fn tmpdir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("wheelie-notes-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn ids_are_filename_safe() {
        assert!(valid_id("n-lq3x9a_2"));
        for bad in ["", "..", "../x", "a/b", "a\\b", "a.b", "C:x", "a b", &"x".repeat(65)] {
            assert!(!valid_id(bad), "{bad:?} should be rejected");
        }
    }

    #[test]
    fn traversal_is_rejected_by_every_operation() {
        let d = tmpdir("trav");
        assert!(read(&d, "../secret").is_err());
        assert!(write(&d, "../evil", "x").is_err());
        assert!(delete(&d, "..\\evil").is_err());
        assert!(!d.parent().unwrap().join("evil.txt").exists());
    }

    #[test]
    fn first_line_is_title_next_lines_are_preview() {
        let (t, p) = title_and_preview("\n  Shopping list \n\nmilk\neggs\nbread\nbutter\n");
        assert_eq!(t, "Shopping list");
        assert_eq!(p, "milk eggs bread");
        assert_eq!(title_and_preview(""), (String::new(), String::new()));
        let (t, _) = title_and_preview(&"é".repeat(100));
        assert_eq!(t.chars().count(), 61); // 60 + ellipsis, counted in chars not bytes
        assert_eq!(title_and_preview("\u{feff}hello").0, "hello");
    }

    #[test]
    fn write_read_roundtrip_and_overwrite() {
        let d = tmpdir("rt");
        write(&d, "a", "first\nsecond").unwrap();
        assert_eq!(read(&d, "a").unwrap(), "first\nsecond");
        write(&d, "a", "changed ✓ ünïcode").unwrap();
        assert_eq!(read(&d, "a").unwrap(), "changed ✓ ünïcode");
        assert!(!d.join("a.txt.tmp").exists(), "temp file must not linger");
        assert!(d.join("a.txt").is_file(), "stored as a plain .txt file");
    }

    #[test]
    fn list_sorts_newest_first_and_ignores_foreign_files() {
        let d = tmpdir("list");
        write(&d, "old", "Old note\nbody").unwrap();
        write(&d, "new", "New note").unwrap();
        let t = SystemTime::now();
        fs::File::options().write(true).open(d.join("old.txt")).unwrap().set_modified(t - Duration::from_secs(3600)).unwrap();
        fs::write(d.join("readme.md"), "not a note").unwrap();
        fs::write(d.join("has space.txt"), "foreign").unwrap();
        fs::create_dir(d.join("dir.txt")).unwrap();
        let l = list(&d).unwrap();
        assert_eq!(l.iter().map(|m| m.id.as_str()).collect::<Vec<_>>(), ["new", "old"]);
        assert_eq!(l[1].title, "Old note");
        assert_eq!(l[1].preview, "body");
    }

    #[test]
    fn delete_is_idempotent_and_leaves_others() {
        let d = tmpdir("del");
        write(&d, "a", "x").unwrap();
        write(&d, "b", "y").unwrap();
        delete(&d, "a").unwrap();
        delete(&d, "a").unwrap();
        assert_eq!(list(&d).unwrap().len(), 1);
    }

    #[test]
    fn reads_files_with_bom_and_invalid_utf8() {
        let d = tmpdir("enc");
        fs::write(d.join("bom.txt"), b"\xEF\xBB\xBFhello").unwrap();
        assert_eq!(read(&d, "bom").unwrap(), "hello");
        fs::write(d.join("ansi.txt"), b"caf\xE9").unwrap();
        assert!(read(&d, "ansi").unwrap().starts_with("caf"));
        assert_eq!(list(&d).unwrap().len(), 2);
    }
}
