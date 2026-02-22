use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub const MODEL_KEY_DEFAULT: &str = "default";
pub const MODEL_KEY_TOOL_CALLING: &str = "tool_calling";

#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    Eq,
    Hash,
    Serialize,
    Deserialize,
    ToSchema,
    strum::Display,
    strum::EnumString,
)]
#[serde(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
pub enum CharTask {
    Chat,
    Enhance,
    Title,
}

pub struct ModelContext {
    pub task: Option<CharTask>,
    pub needs_tool_calling: bool,
}

pub trait ModelResolver: Send + Sync {
    fn resolve(&self, ctx: &ModelContext) -> Vec<String>;
}

#[derive(Clone)]
pub struct StaticModelResolver {
    pub(crate) models: HashMap<String, Vec<String>>,
}

impl Default for StaticModelResolver {
    fn default() -> Self {
        let mut models = HashMap::new();

        models.insert(
            CharTask::Chat.to_string(),
            vec![
                "anthropic/claude-haiku-4.5".into(),
                "anthropic/claude-sonnet-4.6".into(),
                "z-ai/glm-5".into(),
            ],
        );
        models.insert(
            CharTask::Title.to_string(),
            vec![
                "moonshotai/kimi-k2-0905".into(),
                "google/gemini-2.5-flash-lite".into(),
                "z-ai/glm-4.7-flash".into(),
            ],
        );
        models.insert(
            MODEL_KEY_TOOL_CALLING.to_owned(),
            vec![
                "anthropic/claude-sonnet-4.6".into(),
                "anthropic/claude-haiku-4.5".into(),
                "moonshotai/kimi-k2-0905:exacto".into(),
            ],
        );
        models.insert(
            MODEL_KEY_DEFAULT.to_owned(),
            vec![
                "anthropic/claude-sonnet-4.6".into(),
                "openai/gpt-5.2-chat".into(),
                "moonshotai/kimi-k2-0905".into(),
            ],
        );

        Self { models }
    }
}

impl StaticModelResolver {
    pub fn with_models(mut self, key: impl Into<String>, models: Vec<String>) -> Self {
        self.models.insert(key.into(), models);
        self
    }
}

impl ModelResolver for StaticModelResolver {
    fn resolve(&self, ctx: &ModelContext) -> Vec<String> {
        if let Some(models) = ctx.task.and_then(|t| self.models.get(&t.to_string())) {
            return models.clone();
        }

        let key = if ctx.needs_tool_calling {
            MODEL_KEY_TOOL_CALLING
        } else {
            MODEL_KEY_DEFAULT
        };
        self.models.get(key).cloned().unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    type ResolveTestCase = (
        &'static str,
        Option<CharTask>,
        bool,
        Option<(&'static str, Vec<&'static str>)>,
        &'static [&'static str],
    );

    fn run_resolve_test(
        name: &str,
        resolver: StaticModelResolver,
        ctx: ModelContext,
        expected: &[&str],
    ) {
        let models = resolver.resolve(&ctx);
        let expected: Vec<String> = expected.iter().map(|s| (*s).to_string()).collect();
        assert_eq!(models, expected, "{name}");
    }

    #[test]
    fn resolve() {
        let cases: &[ResolveTestCase] = &[
            (
                "by_task",
                Some(CharTask::Chat),
                false,
                None,
                &[
                    "anthropic/claude-haiku-4.5",
                    "anthropic/claude-sonnet-4.6",
                    "z-ai/glm-5",
                ],
            ),
            (
                "by_tool_calling",
                None,
                true,
                None,
                &[
                    "anthropic/claude-sonnet-4.6",
                    "anthropic/claude-haiku-4.5",
                    "moonshotai/kimi-k2-0905:exacto",
                ],
            ),
            (
                "default",
                None,
                false,
                None,
                &[
                    "anthropic/claude-sonnet-4.6",
                    "openai/gpt-5.2-chat",
                    "moonshotai/kimi-k2-0905",
                ],
            ),
            (
                "task_overrides_tool_calling",
                Some(CharTask::Chat),
                true,
                None,
                &[
                    "anthropic/claude-haiku-4.5",
                    "anthropic/claude-sonnet-4.6",
                    "z-ai/glm-5",
                ],
            ),
            (
                "with_models_custom_key",
                Some(CharTask::Enhance),
                false,
                Some(("enhance", vec!["foo/bar"])),
                &["foo/bar"],
            ),
            (
                "unknown_task_falls_back_to_default",
                Some(CharTask::Enhance),
                false,
                None,
                &[
                    "anthropic/claude-sonnet-4.6",
                    "openai/gpt-5.2-chat",
                    "moonshotai/kimi-k2-0905",
                ],
            ),
        ];

        for (name, task, needs_tool_calling, with_models, expected) in cases {
            let mut resolver = StaticModelResolver::default();
            if let Some((key, models)) = with_models {
                resolver =
                    resolver.with_models(*key, models.iter().map(|s| (*s).to_string()).collect());
            }
            run_resolve_test(
                name,
                resolver,
                ModelContext {
                    task: *task,
                    needs_tool_calling: *needs_tool_calling,
                },
                expected,
            );
        }
    }
}
