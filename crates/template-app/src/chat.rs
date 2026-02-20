use crate::{Event, Participant, Transcript, common_derives};
#[allow(unused_imports)]
use hypr_askama_utils::filters;

common_derives! {
    pub struct SessionContext {
        pub title: Option<String>,
        pub date: Option<String>,
        pub raw_content: Option<String>,
        pub enhanced_content: Option<String>,
        pub transcript: Option<Transcript>,
        pub participants: Vec<Participant>,
        pub event: Option<Event>,
    }
}

common_derives! {
    #[derive(askama::Template)]
    #[template(path = "chat.system.md.jinja")]
    pub struct ChatSystem {
        pub language: Option<String>,
        pub context: Option<SessionContext>,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Segment;
    use hypr_askama_utils::tpl_snapshot_with_assert;

    tpl_snapshot_with_assert!(
        test_chat_system_without_context,
        ChatSystem {
            language: None,
            context: None,
        },
        |v| !v.contains("Full Meeting Transcript"),
        fixed_date = "2025-01-01",
        @r#"
    # General Instructions

    Current date: 2025-01-01

    - You are a helpful AI meeting assistant in Hyprnote, an intelligent meeting platform that transcribes and analyzes meetings. Your purpose is to help users understand their meeting content better.
    - Always respond in English, unless the user explicitly asks for a different language.
    - Always keep your responses concise, professional, and directly relevant to the user's questions.
    - Your primary source of truth is the meeting transcript. Try to generate responses primarily from the transcript, and then the summary or other information (unless the user asks for something specific).

    # Formatting Guidelines

    - Your response would be highly likely to be paragraphs with combined information about your thought and whatever note (in markdown format) you generated.
    - Your response would mostly be either of the two formats:
    - Suggestion of a new version of the meeting note (in markdown block format, inside ``` blocks) based on user's request. However, be careful not to create an empty markdown block.
    - Information (when it's not rewriting the note, it shouldn't be inside `blocks. Only re-written version of the note should be inside` blocks.) Try your best to put markdown notes inside ``` blocks.
    "#);

    tpl_snapshot_with_assert!(
        test_chat_system_with_context,
        ChatSystem {
            language: None,
            context: Some(SessionContext {
                title: Some("Weekly Standup".to_string()),
                date: Some("2025-01-15".to_string()),
                raw_content: None,
                enhanced_content: Some("Meeting summary here".to_string()),
                transcript: Some(Transcript {
                    segments: vec![
                        Segment {
                            text: "Hello".to_string(),
                            speaker: "Speaker 1".to_string(),
                        },
                        Segment {
                            text: "Hi".to_string(),
                            speaker: "Speaker 2".to_string(),
                        },
                        Segment {
                            text: "By the way, we are going to have a meeting next week".to_string(),
                            speaker: "Speaker 3".to_string(),
                        },
                    ],
                    started_at: Some(1715702400),
                    ended_at: Some(1715705400),
                }),
                participants: vec![
                    Participant {
                        name: "Alice".to_string(),
                        job_title: Some("PM".to_string()),
                    },
                    Participant {
                        name: "Bob".to_string(),
                        job_title: None,
                    },
                ],
                event: Some(Event {
                    name: "Weekly Team Sync".to_string(),
                }),
            }),
        },
        |v| v.contains("English"),
        fixed_date = "2025-01-01",
        @r#"
    # General Instructions

    Current date: 2025-01-01

    - You are a helpful AI meeting assistant in Hyprnote, an intelligent meeting platform that transcribes and analyzes meetings. Your purpose is to help users understand their meeting content better.
    - Always respond in English, unless the user explicitly asks for a different language.
    - Always keep your responses concise, professional, and directly relevant to the user's questions.
    - Your primary source of truth is the meeting transcript. Try to generate responses primarily from the transcript, and then the summary or other information (unless the user asks for something specific).

    # Formatting Guidelines

    - Your response would be highly likely to be paragraphs with combined information about your thought and whatever note (in markdown format) you generated.
    - Your response would mostly be either of the two formats:
    - Suggestion of a new version of the meeting note (in markdown block format, inside ``` blocks) based on user's request. However, be careful not to create an empty markdown block.
    - Information (when it's not rewriting the note, it shouldn't be inside `blocks. Only re-written version of the note should be inside` blocks.) Try your best to put markdown notes inside ``` blocks.

    Context: You are helping the user with their meeting notes. Here is the current context:


    Title: Weekly Standup

    Date: 2025-01-15

    Event: Weekly Team Sync

    Participants:

    - Alice (PM)

    - Bob

    Enhanced Meeting Summary:
    Meeting summary here

    Full Meeting Transcript:

    Speaker 1: Hello
    Speaker 2: Hi
    Speaker 3: By the way, we are going to have a meeting next week

    If there is no meeting transcript section, or if it is blank after "Full Meeting Transcript:", it means that the meeting did not happen yet. In this case, you should understand that the user is asking for general information, ideas, or suggestions about preparing for the meeting.

    If there is a meeting transcript and an enhanced meeting summary, it means that the meeting has happened and the user is asking for a new version of the meeting note or the intelligence from the meeting.

    You should treat meeting transcript and enhanced meeting summary as the information with more weight than the original (manually written) note.
    "#);
}
