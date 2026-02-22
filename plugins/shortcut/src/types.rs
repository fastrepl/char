use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "snake_case")]
pub enum ShortcutId {
    NewNote,
    NewEmptyTab,
    CloseTab,
    SelectTab1,
    SelectTab2,
    SelectTab3,
    SelectTab4,
    SelectTab5,
    SelectTab6,
    SelectTab7,
    SelectTab8,
    SelectTab9,
    PrevTab,
    NextTab,
    RestoreClosedTab,
    OpenCalendar,
    OpenContacts,
    OpenAiSettings,
    OpenFolders,
    OpenSearch,
    NewNoteAndListen,
    ToggleChat,
    OpenSettings,
    ToggleSidebar,
    FocusSearch,
    OpenNoteDialog,
    SwitchToEnhanced,
    SwitchToRaw,
    SwitchToTranscript,
    PrevPanelTab,
    NextPanelTab,
    TranscriptSearch,
    FindReplace,
    UndoDelete,
    Dismiss,
    PlayPauseAudio,
}

#[derive(Serialize, Deserialize, Clone, Type)]
pub struct ShortcutDef {
    pub id: ShortcutId,
    pub keys: String,
    pub category: ShortcutCategory,
    pub description: String,
    pub scope: ShortcutScope,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Eq, PartialOrd, Ord, Type)]
pub enum ShortcutCategory {
    Navigation,
    View,
    Tabs,
    Search,
    Editor,
}

impl ShortcutCategory {
    pub fn display_name(&self) -> &'static str {
        match self {
            ShortcutCategory::Navigation => "Navigation",
            ShortcutCategory::View => "Sidebar & Panels",
            ShortcutCategory::Tabs => "Notes & Tabs",
            ShortcutCategory::Search => "Quick Access",
            ShortcutCategory::Editor => "Editor",
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Type)]
pub enum ShortcutScope {
    Global,
    Scoped,
}
