use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Serialize, Deserialize, Clone, Type)]
pub struct ShortcutDef {
    pub id: String,
    pub keys: String,
    pub category: ShortcutCategory,
    pub description: String,
    pub scope: ShortcutScope,
}

#[derive(Serialize, Deserialize, Clone, Type)]
pub enum ShortcutCategory {
    Tabs,
    Navigation,
    Editor,
    Search,
    View,
}

#[derive(Serialize, Deserialize, Clone, Type)]
pub enum ShortcutScope {
    Global,
    Scoped,
}
