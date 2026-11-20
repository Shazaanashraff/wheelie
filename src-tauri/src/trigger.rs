//! Platform-independent "hold to open" trigger logic.
//!
//! The Windows hook code (`hook_win.rs`) feeds raw key / mouse events in here,
//! and this state machine decides (a) whether to swallow the event so the
//! foreground app never sees it and (b) whether to emit a ring event.
//! Keeping it free of OS calls means it is unit-testable anywhere.

use std::sync::Mutex;

pub const VK_SPACE: u32 = 0x20;
pub const VK_MENU: u32 = 0x12; // Alt
pub const VK_LMENU: u32 = 0xA4;
pub const VK_RMENU: u32 = 0xA5;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Keyboard {
    Off,
    AltSpace,
    CtrlAltSpace,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Mouse {
    Off,
    Middle,
    X1,
    X2,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum MouseBtn {
    Middle,
    X1,
    X2,
}

#[derive(Clone, Copy, Debug)]
pub struct Config {
    pub keyboard: Keyboard,
    pub mouse: Mouse,
}

impl Config {
    pub const DEFAULT: Config = Config {
        keyboard: Keyboard::AltSpace,
        mouse: Mouse::Middle,
    };
}

/// Shared by the hook thread and the `set_trigger_config` command.
pub static CONFIG: Mutex<Config> = Mutex::new(Config::DEFAULT);

impl Keyboard {
    pub fn parse(s: &str) -> Self {
        match s {
            "alt+space" => Keyboard::AltSpace,
            "ctrl+alt+space" => Keyboard::CtrlAltSpace,
            _ => Keyboard::Off,
        }
    }
}

impl Mouse {
    pub fn parse(s: &str) -> Self {
        match s {
            "middle" => Mouse::Middle,
            "x1" => Mouse::X1,
            "x2" => Mouse::X2,
            _ => Mouse::Off,
        }
    }
    fn matches(self, b: MouseBtn) -> bool {
        matches!(
            (self, b),
            (Mouse::Middle, MouseBtn::Middle) | (Mouse::X1, MouseBtn::X1) | (Mouse::X2, MouseBtn::X2)
        )
    }
}

/// What the app should do in response to the hold.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Event {
    /// Trigger pressed; cursor is at (x, y) in physical screen pixels.
    Down { x: i32, y: i32 },
    /// Cursor moved while the trigger is held.
    Move { x: i32, y: i32 },
    /// Trigger released.
    Up,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Source {
    None,
    Key,
    Mouse,
}

#[derive(Debug)]
pub struct Out {
    pub swallow: bool,
    pub event: Option<Event>,
}

const PASS: Out = Out { swallow: false, event: None };

pub struct KeyInput {
    pub vk: u32,
    pub up: bool,
    pub alt: bool,
    pub ctrl: bool,
    pub cursor: (i32, i32),
}

pub struct Machine {
    source: Source,
    /// After Alt is released before Space, the later Space key-up must still be
    /// swallowed so the foreground app does not see a stray release.
    swallow_space_up: bool,
}

impl Machine {
    pub const fn new() -> Self {
        Machine { source: Source::None, swallow_space_up: false }
    }

    pub fn key(&mut self, cfg: &Config, k: KeyInput) -> Out {
        if k.vk == VK_SPACE {
            if !k.up {
                if self.source == Source::Key {
                    // Auto-repeat while held.
                    return Out { swallow: true, event: None };
                }
                let combo = match cfg.keyboard {
                    Keyboard::Off => false,
                    Keyboard::AltSpace => k.alt && !k.ctrl,
                    Keyboard::CtrlAltSpace => k.alt && k.ctrl,
                };
                if combo && self.source == Source::None {
                    self.source = Source::Key;
                    return Out {
                        swallow: true,
                        event: Some(Event::Down { x: k.cursor.0, y: k.cursor.1 }),
                    };
                }
                return PASS;
            }
            // Space released.
            if self.source == Source::Key {
                self.source = Source::None;
                self.swallow_space_up = false;
                return Out { swallow: true, event: Some(Event::Up) };
            }
            if self.swallow_space_up {
                self.swallow_space_up = false;
                return Out { swallow: true, event: None };
            }
            return PASS;
        }

        // Alt released first: end the hold, but let the Alt release through.
        if k.up && matches!(k.vk, VK_MENU | VK_LMENU | VK_RMENU) && self.source == Source::Key {
            self.source = Source::None;
            self.swallow_space_up = true;
            return Out { swallow: false, event: Some(Event::Up) };
        }
        PASS
    }

    pub fn mouse_button(&mut self, cfg: &Config, btn: MouseBtn, up: bool, pos: (i32, i32)) -> Out {
        if !cfg.mouse.matches(btn) {
            return PASS;
        }
        if !up {
            if self.source == Source::None {
                self.source = Source::Mouse;
                return Out { swallow: true, event: Some(Event::Down { x: pos.0, y: pos.1 }) };
            }
            return PASS;
        }
        if self.source == Source::Mouse {
            self.source = Source::None;
            return Out { swallow: true, event: Some(Event::Up) };
        }
        PASS
    }

    pub fn mouse_move(&mut self, pos: (i32, i32)) -> Out {
        if self.source != Source::None {
            Out { swallow: false, event: Some(Event::Move { x: pos.0, y: pos.1 }) }
        } else {
            PASS
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ALT_SPACE: Config = Config { keyboard: Keyboard::AltSpace, mouse: Mouse::Middle };

    fn space(up: bool, alt: bool, ctrl: bool) -> KeyInput {
        KeyInput { vk: VK_SPACE, up, alt, ctrl, cursor: (100, 200) }
    }
    fn alt_up() -> KeyInput {
        KeyInput { vk: VK_LMENU, up: true, alt: false, ctrl: false, cursor: (0, 0) }
    }

    #[test]
    fn alt_space_hold_and_release() {
        let mut m = Machine::new();
        let d = m.key(&ALT_SPACE, space(false, true, false));
        assert!(d.swallow);
        assert_eq!(d.event, Some(Event::Down { x: 100, y: 200 }));
        // key repeat is swallowed, no new event
        let r = m.key(&ALT_SPACE, space(false, true, false));
        assert!(r.swallow && r.event.is_none());
        let u = m.key(&ALT_SPACE, space(true, true, false));
        assert!(u.swallow);
        assert_eq!(u.event, Some(Event::Up));
    }

    #[test]
    fn plain_space_passes_through() {
        let mut m = Machine::new();
        let d = m.key(&ALT_SPACE, space(false, false, false));
        assert!(!d.swallow && d.event.is_none());
        let u = m.key(&ALT_SPACE, space(true, false, false));
        assert!(!u.swallow && u.event.is_none());
    }

    #[test]
    fn ctrl_alt_space_does_not_trigger_alt_space_mode() {
        let mut m = Machine::new();
        let d = m.key(&ALT_SPACE, space(false, true, true));
        assert!(!d.swallow && d.event.is_none());
    }

    #[test]
    fn ctrl_alt_space_mode() {
        let cfg = Config { keyboard: Keyboard::CtrlAltSpace, mouse: Mouse::Off };
        let mut m = Machine::new();
        assert!(m.key(&cfg, space(false, true, false)).event.is_none());
        assert!(m.key(&cfg, space(false, true, true)).event.is_some());
    }

    #[test]
    fn alt_released_before_space_ends_hold_and_swallows_space_up() {
        let mut m = Machine::new();
        m.key(&ALT_SPACE, space(false, true, false));
        let a = m.key(&ALT_SPACE, alt_up());
        assert!(!a.swallow, "Alt release must reach the app");
        assert_eq!(a.event, Some(Event::Up));
        let s = m.key(&ALT_SPACE, space(true, false, false));
        assert!(s.swallow && s.event.is_none());
        // and only once
        let s2 = m.key(&ALT_SPACE, space(true, false, false));
        assert!(!s2.swallow);
    }

    #[test]
    fn keyboard_off_never_triggers() {
        let cfg = Config { keyboard: Keyboard::Off, mouse: Mouse::Off };
        let mut m = Machine::new();
        assert!(!m.key(&cfg, space(false, true, false)).swallow);
    }

    #[test]
    fn middle_button_hold_move_release() {
        let mut m = Machine::new();
        let d = m.mouse_button(&ALT_SPACE, MouseBtn::Middle, false, (5, 6));
        assert!(d.swallow);
        assert_eq!(d.event, Some(Event::Down { x: 5, y: 6 }));
        let mv = m.mouse_move((9, 9));
        assert!(!mv.swallow);
        assert_eq!(mv.event, Some(Event::Move { x: 9, y: 9 }));
        let u = m.mouse_button(&ALT_SPACE, MouseBtn::Middle, true, (9, 9));
        assert!(u.swallow);
        assert_eq!(u.event, Some(Event::Up));
        // moves after release emit nothing
        assert!(m.mouse_move((1, 1)).event.is_none());
    }

    #[test]
    fn other_mouse_button_passes() {
        let mut m = Machine::new();
        let d = m.mouse_button(&ALT_SPACE, MouseBtn::X1, false, (0, 0));
        assert!(!d.swallow && d.event.is_none());
    }

    #[test]
    fn x2_button_when_configured() {
        let cfg = Config { keyboard: Keyboard::Off, mouse: Mouse::X2 };
        let mut m = Machine::new();
        assert!(m.mouse_button(&cfg, MouseBtn::X2, false, (0, 0)).swallow);
        assert!(m.mouse_button(&cfg, MouseBtn::X2, true, (0, 0)).swallow);
    }

    #[test]
    fn second_trigger_ignored_while_active() {
        let mut m = Machine::new();
        m.key(&ALT_SPACE, space(false, true, false));
        let d = m.mouse_button(&ALT_SPACE, MouseBtn::Middle, false, (0, 0));
        assert!(!d.swallow && d.event.is_none());
        // and its release must not end the keyboard hold
        let u = m.mouse_button(&ALT_SPACE, MouseBtn::Middle, true, (0, 0));
        assert!(!u.swallow && u.event.is_none());
    }

    #[test]
    fn config_parsing() {
        assert_eq!(Keyboard::parse("alt+space"), Keyboard::AltSpace);
        assert_eq!(Keyboard::parse("nope"), Keyboard::Off);
        assert_eq!(Mouse::parse("x1"), Mouse::X1);
        assert_eq!(Mouse::parse("off"), Mouse::Off);
    }
}
