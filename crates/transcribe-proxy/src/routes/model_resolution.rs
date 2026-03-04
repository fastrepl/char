use std::str::FromStr;

use owhisper_client::{AdapterKind, DeepgramModel, Provider, is_meta_model};
use owhisper_interface::ListenParams;

fn should_override_deepgram_model(model: &str, languages: &[hypr_language::Language]) -> bool {
    if let Ok(parsed_model) = DeepgramModel::from_str(model) {
        !languages
            .iter()
            .all(|lang| parsed_model.supports_language(lang))
    } else {
        false
    }
}

pub(super) fn resolve_model(provider: Provider, listen_params: &mut ListenParams) {
    let needs_resolution = match &listen_params.model {
        None => true,
        Some(m) if is_meta_model(m) => true,
        Some(model) if provider == Provider::Deepgram => {
            should_override_deepgram_model(model, &listen_params.languages)
        }
        _ => false,
    };

    if needs_resolution {
        listen_params.model = AdapterKind::from(provider)
            .recommended_model_live(&listen_params.languages)
            .map(|m| m.to_string());
    }
}
