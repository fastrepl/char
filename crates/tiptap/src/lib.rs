#![recursion_limit = "256"]

mod from_ast;
mod from_md;
mod to_ast;

pub use from_ast::mdast_to_markdown;
pub use from_md::md_to_tiptap_json;
pub use to_ast::tiptap_json_to_mdast;

pub fn tiptap_json_to_md(json: &serde_json::Value) -> Result<String, String> {
    let mdast = tiptap_json_to_mdast(json);
    mdast_to_markdown(&mdast)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn to_md(json: serde_json::Value) -> String {
        let mdast = tiptap_json_to_mdast(&json);
        mdast_to_markdown(&mdast).unwrap()
    }

    #[test]
    fn test_tiptap_to_markdown() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "heading",
                    "attrs": { "level": 1 },
                    "content": [{ "type": "text", "text": "Title" }]
                },
                {
                    "type": "paragraph",
                    "content": [{ "type": "text", "text": "Hello, world!" }]
                },
                {
                    "type": "heading",
                    "attrs": { "level": 2 },
                    "content": [{ "type": "text", "text": "Formatting" }]
                },
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "This is " },
                        { "type": "text", "text": "bold", "marks": [{ "type": "bold" }] },
                        { "type": "text", "text": " and " },
                        { "type": "text", "text": "italic", "marks": [{ "type": "italic" }] },
                        { "type": "text", "text": " and " },
                        { "type": "text", "text": "code", "marks": [{ "type": "code" }] },
                        { "type": "text", "text": " text." }
                    ]
                },
                {
                    "type": "heading",
                    "attrs": { "level": 2 },
                    "content": [{ "type": "text", "text": "Lists" }]
                },
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "Bullet 1" }]
                            }]
                        },
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "Bullet 2" }]
                            }]
                        }
                    ]
                },
                {
                    "type": "orderedList",
                    "attrs": { "start": 1 },
                    "content": [
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "First" }]
                            }]
                        },
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "Second" }]
                            }]
                        }
                    ]
                },
                {
                    "type": "heading",
                    "attrs": { "level": 2 },
                    "content": [{ "type": "text", "text": "Other" }]
                },
                {
                    "type": "blockquote",
                    "content": [{
                        "type": "paragraph",
                        "content": [{ "type": "text", "text": "A quote" }]
                    }]
                },
                {
                    "type": "codeBlock",
                    "attrs": { "language": "rust" },
                    "content": [{ "type": "text", "text": "fn main() {}" }]
                },
                { "type": "horizontalRule" },
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "A ", "marks": [{ "type": "link", "attrs": { "href": "https://example.com" } }] },
                        { "type": "text", "text": "link", "marks": [{ "type": "link", "attrs": { "href": "https://example.com" } }] }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @"
        # Title

        Hello, world!

        ## Formatting

        This is **bold** and *italic* and `code` text.

        ## Lists

        - Bullet 1
        - Bullet 2

        1. First
        2. Second

        ## Other

        > A quote

        ```rust
        fn main() {}
        ```

        ***

        [A ](https://example.com)[link](https://example.com)
        ");
    }

    #[test]
    fn test_task_list() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "taskList",
                    "content": [
                        {
                            "type": "taskItem",
                            "attrs": { "checked": false },
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "unchecked task" }]
                            }]
                        },
                        {
                            "type": "taskItem",
                            "attrs": { "checked": true },
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "checked task" }]
                            }]
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r"
        - [ ] unchecked task
        - [x] checked task
        ");
    }

    #[test]
    fn test_image() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "image",
                            "attrs": {
                                "src": "https://example.com/image.png",
                                "alt": "example image",
                                "title": "Example"
                            }
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r#"![example image](https://example.com/image.png "Example")"#);
    }

    #[test]
    fn test_md_to_tiptap_basic() {
        let md = "# Hello\n\nWorld";
        let json = md_to_tiptap_json(md).unwrap();

        assert_eq!(json["type"], "doc");
        assert_eq!(json["content"][0]["type"], "heading");
        assert_eq!(json["content"][0]["attrs"]["level"], 1);
        assert_eq!(json["content"][1]["type"], "paragraph");
    }

    #[test]
    fn test_md_to_tiptap_task_list() {
        let md = "- [ ] unchecked\n- [x] checked";
        let json = md_to_tiptap_json(md).unwrap();

        assert_eq!(json["content"][0]["type"], "taskList");
        assert_eq!(json["content"][0]["content"][0]["type"], "taskItem");
        assert_eq!(json["content"][0]["content"][0]["attrs"]["checked"], false);
        assert_eq!(json["content"][0]["content"][1]["attrs"]["checked"], true);
    }

    #[test]
    fn test_nested_lists_deep() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{ "type": "text", "text": "Level 1 item 1" }]
                                },
                                {
                                    "type": "bulletList",
                                    "content": [
                                        {
                                            "type": "listItem",
                                            "content": [
                                                {
                                                    "type": "paragraph",
                                                    "content": [{ "type": "text", "text": "Level 2 item 1" }]
                                                },
                                                {
                                                    "type": "bulletList",
                                                    "content": [
                                                        {
                                                            "type": "listItem",
                                                            "content": [
                                                                {
                                                                    "type": "paragraph",
                                                                    "content": [{ "type": "text", "text": "Level 3 item 1" }]
                                                                },
                                                                {
                                                                    "type": "bulletList",
                                                                    "content": [
                                                                        {
                                                                            "type": "listItem",
                                                                            "content": [{
                                                                                "type": "paragraph",
                                                                                "content": [{ "type": "text", "text": "Level 4 item 1" }]
                                                                            }]
                                                                        }
                                                                    ]
                                                                }
                                                            ]
                                                        },
                                                        {
                                                            "type": "listItem",
                                                            "content": [{
                                                                "type": "paragraph",
                                                                "content": [{ "type": "text", "text": "Level 3 item 2" }]
                                                            }]
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            "type": "listItem",
                                            "content": [{
                                                "type": "paragraph",
                                                "content": [{ "type": "text", "text": "Level 2 item 2" }]
                                            }]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "Level 1 item 2" }]
                            }]
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r"
        - Level 1 item 1
          - Level 2 item 1
            - Level 3 item 1
              - Level 4 item 1
            - Level 3 item 2
          - Level 2 item 2
        - Level 1 item 2
        ");
    }

    #[test]
    fn test_mixed_task_and_regular_lists() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "bulletList",
                    "content": [
                        {
                            "type": "listItem",
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "Regular bullet item" }]
                            }]
                        },
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{ "type": "text", "text": "Another bullet" }]
                                },
                                {
                                    "type": "taskList",
                                    "content": [
                                        {
                                            "type": "taskItem",
                                            "attrs": { "checked": false },
                                            "content": [{
                                                "type": "paragraph",
                                                "content": [{ "type": "text", "text": "Nested task item" }]
                                            }]
                                        },
                                        {
                                            "type": "taskItem",
                                            "attrs": { "checked": true },
                                            "content": [{
                                                "type": "paragraph",
                                                "content": [{ "type": "text", "text": "Completed nested task" }]
                                            }]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "type": "taskList",
                    "content": [
                        {
                            "type": "taskItem",
                            "attrs": { "checked": false },
                            "content": [{
                                "type": "paragraph",
                                "content": [{ "type": "text", "text": "Top-level task" }]
                            }]
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r"
        - Regular bullet item
        - Another bullet
          - [ ] Nested task item
          - [x] Completed nested task

        * [ ] Top-level task
        ");
    }

    #[test]
    fn test_complex_inline_formatting() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        { "type": "text", "text": "Text with " },
                        {
                            "type": "text",
                            "text": "bold and italic",
                            "marks": [{ "type": "bold" }, { "type": "italic" }]
                        },
                        { "type": "text", "text": " combined." }
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Bold with ",
                            "marks": [{ "type": "bold" }]
                        },
                        {
                            "type": "text",
                            "text": "nested italic",
                            "marks": [{ "type": "bold" }, { "type": "italic" }]
                        },
                        {
                            "type": "text",
                            "text": " inside",
                            "marks": [{ "type": "bold" }]
                        },
                        { "type": "text", "text": " normal text." }
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Bold link",
                            "marks": [
                                { "type": "bold" },
                                { "type": "link", "attrs": { "href": "https://example.com" } }
                            ]
                        },
                        { "type": "text", "text": " and " },
                        {
                            "type": "text",
                            "text": "italic code",
                            "marks": [{ "type": "italic" }, { "type": "code" }]
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r"
        Text with ***bold and italic*** combined.

        **Bold with *****nested italic***** inside** normal text.

        **[Bold link](https://example.com)** and *`italic code`*
        ");
    }

    #[test]
    fn test_links_with_special_characters() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Link with query params",
                            "marks": [{
                                "type": "link",
                                "attrs": { "href": "https://example.com/path?foo=bar&baz=qux" }
                            }]
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Link with fragment",
                            "marks": [{
                                "type": "link",
                                "attrs": { "href": "https://example.com/page#section-1" }
                            }]
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Link with encoded spaces",
                            "marks": [{
                                "type": "link",
                                "attrs": { "href": "https://example.com/path%20with%20spaces" }
                            }]
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Link with title",
                            "marks": [{
                                "type": "link",
                                "attrs": {
                                    "href": "https://example.com",
                                    "title": "Example Site"
                                }
                            }]
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r#"
        [Link with query params](https://example.com/path?foo=bar\&baz=qux)

        [Link with fragment](https://example.com/page#section-1)

        [Link with encoded spaces](https://example.com/path%20with%20spaces)

        [Link with title](https://example.com "Example Site")
        "#);
    }

    #[test]
    fn test_task_list_with_formatting() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "taskList",
                    "content": [
                        {
                            "type": "taskItem",
                            "attrs": { "checked": false },
                            "content": [{
                                "type": "paragraph",
                                "content": [
                                    { "type": "text", "text": "Task with " },
                                    { "type": "text", "text": "bold", "marks": [{ "type": "bold" }] },
                                    { "type": "text", "text": " text" }
                                ]
                            }]
                        },
                        {
                            "type": "taskItem",
                            "attrs": { "checked": true },
                            "content": [{
                                "type": "paragraph",
                                "content": [
                                    { "type": "text", "text": "Task with " },
                                    { "type": "text", "text": "italic", "marks": [{ "type": "italic" }] },
                                    { "type": "text", "text": " and " },
                                    { "type": "text", "text": "code", "marks": [{ "type": "code" }] }
                                ]
                            }]
                        },
                        {
                            "type": "taskItem",
                            "attrs": { "checked": false },
                            "content": [{
                                "type": "paragraph",
                                "content": [
                                    { "type": "text", "text": "Task with " },
                                    {
                                        "type": "text",
                                        "text": "link",
                                        "marks": [{ "type": "link", "attrs": { "href": "https://example.com" } }]
                                    }
                                ]
                            }]
                        },
                        {
                            "type": "taskItem",
                            "attrs": { "checked": true },
                            "content": [{
                                "type": "paragraph",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "Bold and italic task",
                                        "marks": [{ "type": "bold" }, { "type": "italic" }]
                                    }
                                ]
                            }]
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r"
        - [ ] Task with **bold** text
        - [x] Task with *italic* and `code`
        - [ ] Task with [link](https://example.com)
        - [x] ***Bold and italic task***
        ");
    }

    #[test]
    fn test_blockquote_nesting() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "blockquote",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{ "type": "text", "text": "First level quote" }]
                        },
                        {
                            "type": "blockquote",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{ "type": "text", "text": "Second level quote" }]
                                },
                                {
                                    "type": "blockquote",
                                    "content": [{
                                        "type": "paragraph",
                                        "content": [{ "type": "text", "text": "Third level quote" }]
                                    }]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r"
        > First level quote
        >
        > > Second level quote
        > >
        > > > Third level quote
        ");
    }

    #[test]
    fn test_blockquote_with_formatting() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "blockquote",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                { "type": "text", "text": "Quote with " },
                                { "type": "text", "text": "bold", "marks": [{ "type": "bold" }] },
                                { "type": "text", "text": " and " },
                                { "type": "text", "text": "italic", "marks": [{ "type": "italic" }] },
                                { "type": "text", "text": " and " },
                                { "type": "text", "text": "code", "marks": [{ "type": "code" }] }
                            ]
                        },
                        {
                            "type": "paragraph",
                            "content": [
                                { "type": "text", "text": "Multiple paragraphs in quote" }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [{
                                        "type": "paragraph",
                                        "content": [{ "type": "text", "text": "List inside quote" }]
                                    }]
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r"
        > Quote with **bold** and *italic* and `code`
        >
        > Multiple paragraphs in quote
        >
        > - List inside quote
        ");
    }

    #[test]
    fn test_special_characters_in_text() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [{ "type": "text", "text": "Text with emoji: 🎉 🚀 ✨" }]
                },
                {
                    "type": "paragraph",
                    "content": [{ "type": "text", "text": "Unicode: café, naïve, 中文, العربية" }]
                },
                {
                    "type": "paragraph",
                    "content": [{ "type": "text", "text": "Special chars: & < > \" ' `" }]
                },
                {
                    "type": "paragraph",
                    "content": [{ "type": "text", "text": "Math symbols: × ÷ ≠ ≤ ≥ ∞" }]
                },
                {
                    "type": "paragraph",
                    "content": [{ "type": "text", "text": "Punctuation: — – … « »" }]
                }
            ]
        });

        insta::assert_snapshot!(to_md(json), @r#"
        Text with emoji: 🎉 🚀 ✨

        Unicode: café, naïve, 中文, العربية

        Special chars: & < > " ' `

        Math symbols: × ÷ ≠ ≤ ≥ ∞

        Punctuation: — – … « »
        "#);
    }

    #[test]
    fn test_roundtrip_basic_formatting() {
        let md = "**bold** and *italic* and `code`";
        let json = md_to_tiptap_json(md).unwrap();
        let result = to_md(json);
        assert_eq!(result.trim(), md);
    }

    #[test]
    fn test_roundtrip_lists() {
        let md = "- Item 1\n- Item 2\n- Item 3";
        let json = md_to_tiptap_json(md).unwrap();
        let result = to_md(json);
        assert_eq!(result.trim(), md);
    }

    #[test]
    fn test_roundtrip_task_list() {
        let md = "- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3";
        let json = md_to_tiptap_json(md).unwrap();
        let result = to_md(json);
        assert_eq!(result.trim(), md);
    }

    #[test]
    fn test_roundtrip_headings() {
        let md = "# H1\n\n## H2\n\n### H3";
        let json = md_to_tiptap_json(md).unwrap();
        let result = to_md(json);
        assert_eq!(result.trim(), md);
    }

    #[test]
    fn test_roundtrip_blockquote() {
        let md = "> This is a quote";
        let json = md_to_tiptap_json(md).unwrap();
        let result = to_md(json);
        assert_eq!(result.trim(), md);
    }

    #[test]
    fn test_roundtrip_code_block() {
        let md = "```rust\nfn main() {}\n```";
        let json = md_to_tiptap_json(md).unwrap();
        let result = to_md(json);
        assert_eq!(result.trim(), md);
    }

    #[test]
    fn test_roundtrip_complex_document() {
        let md =
            "# Title\n\nParagraph with **bold** and *italic*.\n\n- Item 1\n- Item 2\n\n> A quote";
        let json = md_to_tiptap_json(md).unwrap();
        let result = to_md(json);
        assert_eq!(result.trim(), md);
    }

    #[test]
    fn test_multibyte_chars_no_panic() {
        let json = serde_json::json!({
            "type": "doc",
            "content": [{
                "type": "bulletList",
                "content": [
                    {
                        "type": "listItem",
                        "content": [{
                            "type": "paragraph",
                            "content": [{
                                "type": "text",
                                "text": "Sad music track began playing on one side, noted aloud as \u{201C}"
                            }]
                        }]
                    },
                    {
                        "type": "listItem",
                        "content": [{
                            "type": "paragraph",
                            "content": [{
                                "type": "text",
                                "text": "\"Projet 'A à Z' sans supervision\"\u{00A0}"
                            }]
                        }]
                    }
                ]
            }]
        });

        let result = tiptap_json_to_md(&json);
        assert!(result.is_ok(), "should not panic on multi-byte chars");
    }
}
