use crate::registry;
use crate::types::ShortcutCategory;

pub struct DocSection {
    pub title: String,
    pub shortcuts: Vec<DocShortcutEntry>,
}

pub struct DocShortcutEntry {
    pub keys_display: String,
    pub description: String,
}

fn format_key_part(part: &str) -> String {
    match part {
        "mod" => "<kbd>\u{2318}</kbd>".to_string(),
        "shift" => "<kbd>\u{21e7}</kbd>".to_string(),
        "alt" => "<kbd>\u{2325}</kbd>".to_string(),
        "ctrl" => "<kbd>\u{2303}</kbd>".to_string(),
        "left" => "<kbd>\u{2190}</kbd>".to_string(),
        "right" => "<kbd>\u{2192}</kbd>".to_string(),
        "space" => "<kbd>Space</kbd>".to_string(),
        "esc" => "<kbd>Esc</kbd>".to_string(),
        "comma" => "<kbd>,</kbd>".to_string(),
        "\\" => "<kbd>\\</kbd>".to_string(),
        other => {
            let display = other.to_uppercase();
            format!("<kbd>{}</kbd>", display)
        }
    }
}

pub fn format_keys_as_kbd(keys: &str) -> String {
    keys.split('+')
        .map(|part| format_key_part(part.trim()))
        .collect::<Vec<_>>()
        .join(" + ")
}

pub fn build_sections() -> Vec<DocSection> {
    let all = registry::all();

    let mut categories: Vec<ShortcutCategory> = all.iter().map(|s| s.category.clone()).collect();
    categories.sort();
    categories.dedup();

    categories
        .into_iter()
        .map(|cat| {
            let shortcuts = all
                .iter()
                .filter(|s| s.category == cat)
                .map(|s| DocShortcutEntry {
                    keys_display: format_keys_as_kbd(&s.keys),
                    description: s.description.clone(),
                })
                .collect();

            DocSection {
                title: cat.display_name().to_string(),
                shortcuts,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_keys_mod_n() {
        assert_eq!(
            format_keys_as_kbd("mod+n"),
            "<kbd>\u{2318}</kbd> + <kbd>N</kbd>"
        );
    }

    #[test]
    fn test_format_keys_mod_shift_n() {
        assert_eq!(
            format_keys_as_kbd("mod+shift+n"),
            "<kbd>\u{2318}</kbd> + <kbd>\u{21e7}</kbd> + <kbd>N</kbd>"
        );
    }

    #[test]
    fn test_format_keys_alt_s() {
        assert_eq!(
            format_keys_as_kbd("alt+s"),
            "<kbd>\u{2325}</kbd> + <kbd>S</kbd>"
        );
    }

    #[test]
    fn test_format_keys_ctrl_alt_left() {
        assert_eq!(
            format_keys_as_kbd("ctrl+alt+left"),
            "<kbd>\u{2303}</kbd> + <kbd>\u{2325}</kbd> + <kbd>\u{2190}</kbd>"
        );
    }

    #[test]
    fn test_format_keys_space() {
        assert_eq!(format_keys_as_kbd("space"), "<kbd>Space</kbd>");
    }

    #[test]
    fn test_format_keys_mod_backslash() {
        assert_eq!(
            format_keys_as_kbd("mod+\\"),
            "<kbd>\u{2318}</kbd> + <kbd>\\</kbd>"
        );
    }

    #[test]
    fn test_format_keys_mod_comma() {
        assert_eq!(
            format_keys_as_kbd("mod+comma"),
            "<kbd>\u{2318}</kbd> + <kbd>,</kbd>"
        );
    }
}
