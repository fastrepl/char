use async_openai::types::ChatCompletionTool;

pub use hypr_llm_types::{FromOpenAI, Message as LlamaMessage};

#[derive(Default)]
pub struct LlamaRequest {
    pub grammar: Option<String>,
    pub messages: Vec<LlamaMessage>,
    pub tools: Option<Vec<ChatCompletionTool>>,
    pub max_tokens: Option<u32>,
}
