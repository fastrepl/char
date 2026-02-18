use std::collections::HashSet;

use hypr_language::Language;
use owhisper_client::{AdapterKind, LanguageSupport, Provider};

const DEFAULT_NUM_RETRIES: usize = 2;
const DEFAULT_MAX_DELAY_SECS: u64 = 5;

#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub num_retries: usize,
    pub max_delay_secs: u64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            num_retries: DEFAULT_NUM_RETRIES,
            max_delay_secs: DEFAULT_MAX_DELAY_SECS,
        }
    }
}

#[derive(Debug, Clone)]
pub struct HyprnoteRoutingConfig {
    pub priorities: Vec<Provider>,
    pub retry_config: RetryConfig,
}

impl Default for HyprnoteRoutingConfig {
    fn default() -> Self {
        Self {
            priorities: vec![
                Provider::Deepgram,
                Provider::Soniox,
                Provider::AssemblyAI,
                Provider::Gladia,
                Provider::ElevenLabs,
                Provider::Fireworks,
                Provider::OpenAI,
            ],
            retry_config: RetryConfig::default(),
        }
    }
}

pub struct HyprnoteRouter {
    priorities: Vec<Provider>,
    retry_config: RetryConfig,
}

impl HyprnoteRouter {
    pub fn new(config: HyprnoteRoutingConfig) -> Self {
        Self {
            priorities: config.priorities,
            retry_config: config.retry_config,
        }
    }

    pub fn select_provider(
        &self,
        languages: &[Language],
        available_providers: &HashSet<Provider>,
    ) -> Option<Provider> {
        self.select_provider_chain(languages, available_providers)
            .into_iter()
            .next()
    }

    pub fn select_provider_chain(
        &self,
        languages: &[Language],
        available_providers: &HashSet<Provider>,
    ) -> Vec<Provider> {
        let mut candidates: Vec<_> = self
            .priorities
            .iter()
            .copied()
            .filter_map(|p| {
                let support = self.get_language_support(&p, languages, available_providers);
                if support.is_supported() {
                    Some((p, support))
                } else {
                    None
                }
            })
            .collect();

        candidates.sort_by(|a, b| {
            let (p1, s1) = a;
            let (p2, s2) = b;
            match s2.cmp(s1) {
                std::cmp::Ordering::Equal => {
                    let idx1 = self
                        .priorities
                        .iter()
                        .position(|p| p == p1)
                        .unwrap_or(usize::MAX);
                    let idx2 = self
                        .priorities
                        .iter()
                        .position(|p| p == p2)
                        .unwrap_or(usize::MAX);
                    idx1.cmp(&idx2)
                }
                other => other,
            }
        });

        candidates.into_iter().map(|(p, _)| p).collect()
    }

    fn get_language_support(
        &self,
        provider: &Provider,
        languages: &[Language],
        available_providers: &HashSet<Provider>,
    ) -> LanguageSupport {
        if !available_providers.contains(provider) {
            return LanguageSupport::NotSupported;
        }
        AdapterKind::from(*provider).language_support_live(languages, None)
    }

    pub fn retry_config(&self) -> &RetryConfig {
        &self.retry_config
    }
}

impl Default for HyprnoteRouter {
    fn default() -> Self {
        Self::new(HyprnoteRoutingConfig::default())
    }
}

pub fn is_retryable_error(error: &str) -> bool {
    let error_lower = error.to_lowercase();

    let is_auth_error = error_lower.contains("401")
        || error_lower.contains("403")
        || error_lower.contains("unauthorized")
        || error_lower.contains("forbidden");

    let is_client_error = error_lower.contains("400") || error_lower.contains("invalid");

    if is_auth_error || is_client_error {
        return false;
    }

    error_lower.contains("timeout")
        || error_lower.contains("connection")
        || error_lower.contains("500")
        || error_lower.contains("502")
        || error_lower.contains("503")
        || error_lower.contains("504")
        || error_lower.contains("temporarily")
        || error_lower.contains("rate limit")
        || error_lower.contains("too many requests")
}

pub fn should_use_hyprnote_routing(provider_param: Option<&str>) -> bool {
    provider_param == Some("hyprnote")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_available_providers(providers: &[Provider]) -> HashSet<Provider> {
        providers.iter().copied().collect()
    }

    #[test]
    fn test_select_provider_by_priority() {
        let router = HyprnoteRouter::default();
        let available = make_available_providers(&[Provider::Soniox, Provider::Deepgram]);
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        let selected = router.select_provider(&languages, &available);
        assert_eq!(selected, Some(Provider::Deepgram));
    }

    #[test]
    fn test_select_provider_fallback_when_first_unavailable() {
        let router = HyprnoteRouter::default();
        let available = make_available_providers(&[Provider::Soniox, Provider::AssemblyAI]);
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        let selected = router.select_provider(&languages, &available);
        assert_eq!(selected, Some(Provider::Soniox));
    }

    #[test]
    fn test_select_provider_none_when_no_available() {
        let router = HyprnoteRouter::default();
        let available = HashSet::new();
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        let selected = router.select_provider(&languages, &available);
        assert_eq!(selected, None);
    }

    #[test]
    fn test_select_provider_filters_by_language_support() {
        let router = HyprnoteRouter::default();
        let available =
            make_available_providers(&[Provider::Deepgram, Provider::Soniox, Provider::AssemblyAI]);

        let ko_en: Vec<Language> = vec!["ko".parse().unwrap(), "en".parse().unwrap()];
        let selected = router.select_provider(&ko_en, &available);
        assert_eq!(selected, Some(Provider::Soniox));
    }

    #[test]
    fn test_select_provider_chain() {
        let router = HyprnoteRouter::default();
        let available =
            make_available_providers(&[Provider::Deepgram, Provider::Soniox, Provider::AssemblyAI]);
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        let chain = router.select_provider_chain(&languages, &available);
        assert_eq!(chain.len(), 3);
        assert_eq!(chain[0], Provider::Deepgram);
        assert_eq!(chain[1], Provider::Soniox);
        assert_eq!(chain[2], Provider::AssemblyAI);
    }

    #[test]
    fn test_should_use_hyprnote_routing_explicit_hyprnote() {
        assert!(super::should_use_hyprnote_routing(Some("hyprnote")));
    }

    #[test]
    fn test_should_use_hyprnote_routing_valid_provider() {
        assert!(!super::should_use_hyprnote_routing(Some("deepgram")));
        assert!(!super::should_use_hyprnote_routing(Some("soniox")));
        assert!(!super::should_use_hyprnote_routing(Some("assemblyai")));
    }

    #[test]
    fn test_should_use_hyprnote_routing_no_provider() {
        assert!(!super::should_use_hyprnote_routing(None));
    }

    #[test]
    fn test_should_use_hyprnote_routing_invalid_provider() {
        assert!(!super::should_use_hyprnote_routing(Some("invalid")));
        assert!(!super::should_use_hyprnote_routing(Some(
            "unknown_provider"
        )));
        assert!(!super::should_use_hyprnote_routing(Some("")));
        assert!(!super::should_use_hyprnote_routing(Some("auto")));
    }

    #[test]
    fn test_select_provider_prefers_quality_over_priority() {
        let router = HyprnoteRouter::default();
        let available =
            make_available_providers(&[Provider::Deepgram, Provider::Soniox, Provider::ElevenLabs]);

        let ko: Vec<Language> = vec!["ko".parse().unwrap()];
        let chain = router.select_provider_chain(&ko, &available);

        assert_eq!(chain[0], Provider::Soniox);
        assert_eq!(chain[1], Provider::Deepgram);
        assert_eq!(chain[2], Provider::ElevenLabs);
    }

    fn default_available() -> HashSet<Provider> {
        make_available_providers(&[Provider::Deepgram, Provider::Soniox])
    }

    fn langs(codes: &[&str]) -> Vec<Language> {
        codes.iter().map(|c| c.parse().unwrap()).collect()
    }

    fn format_provider(p: Option<Provider>) -> String {
        match p {
            Some(p) => format!("{p:?}"),
            None => "None".to_string(),
        }
    }

    fn format_chain(chain: &[Provider]) -> String {
        let names: Vec<_> = chain.iter().map(|p| format!("{p:?}")).collect();
        format!("[{}]", names.join(", "))
    }

    #[test]
    fn routing_table_single_language() {
        let router = HyprnoteRouter::default();
        let available = default_available();

        let codes = [
            "en", "es", "fr", "de", "it", "ja", "ko", "zh", "ar", "hi", "pt", "ru", "nl", "sv",
            "vi", "pl", "tr",
        ];

        let mut table = String::new();
        for code in codes {
            let selected = router.select_provider(&langs(&[code]), &available);
            let chain = router.select_provider_chain(&langs(&[code]), &available);
            table.push_str(&format!(
                "{code:>4} => {:12} chain={}\n",
                format_provider(selected),
                format_chain(&chain),
            ));
        }

        insta::assert_snapshot!(table);
    }

    #[test]
    fn routing_table_multi_language() {
        let router = HyprnoteRouter::default();
        let available = default_available();

        let combos: &[&[&str]] = &[
            &["en", "es"],
            &["en", "fr"],
            &["en", "de"],
            &["en", "ja"],
            &["en", "ko"],
            &["en", "zh"],
            &["ko", "en"],
            &["zh", "en"],
            &["de", "fr"],
            &["es", "fr"],
            &["en", "hi"],
            &["en", "ru"],
            &["en", "pt"],
            &["en", "it"],
            &["en", "nl"],
        ];

        let mut table = String::new();
        for combo in combos {
            let selected = router.select_provider(&langs(combo), &available);
            let chain = router.select_provider_chain(&langs(combo), &available);
            table.push_str(&format!(
                "{:>12} => {:12} chain={}\n",
                format!("{combo:?}"),
                format_provider(selected),
                format_chain(&chain),
            ));
        }

        insta::assert_snapshot!(table);
    }

    const TEST_LANG_CODES: &[&str] = &[
        "en", "es", "fr", "de", "it", "ja", "ko", "zh", "ar", "hi", "pt", "ru", "nl", "sv",
        "vi",
    ];

    #[derive(Debug, Clone)]
    struct LangCombo(Vec<Language>);

    impl quickcheck::Arbitrary for LangCombo {
        fn arbitrary(g: &mut quickcheck::Gen) -> Self {
            let count = *g.choose(&[1usize, 2, 3]).unwrap();
            let langs = (0..count)
                .map(|_| g.choose(TEST_LANG_CODES).unwrap().parse().unwrap())
                .collect();
            LangCombo(langs)
        }
    }

    #[quickcheck_macros::quickcheck]
    fn prop_select_is_first_of_chain(combo: LangCombo) -> bool {
        let router = HyprnoteRouter::default();
        let available = default_available();
        router.select_provider(&combo.0, &available)
            == router
                .select_provider_chain(&combo.0, &available)
                .into_iter()
                .next()
    }

    #[quickcheck_macros::quickcheck]
    fn prop_chain_no_duplicates(combo: LangCombo) -> bool {
        let router = HyprnoteRouter::default();
        let available = default_available();
        let chain = router.select_provider_chain(&combo.0, &available);
        let unique: HashSet<_> = chain.iter().collect();
        unique.len() == chain.len()
    }

    #[quickcheck_macros::quickcheck]
    fn prop_chain_subset_of_available(combo: LangCombo) -> bool {
        let router = HyprnoteRouter::default();
        let available = default_available();
        router
            .select_provider_chain(&combo.0, &available)
            .iter()
            .all(|p| available.contains(p))
    }

    #[quickcheck_macros::quickcheck]
    fn prop_language_order_independent(combo: LangCombo) -> bool {
        let router = HyprnoteRouter::default();
        let available = default_available();
        let mut reversed = combo.0.clone();
        reversed.reverse();
        router.select_provider(&combo.0, &available)
            == router.select_provider(&reversed, &available)
    }

    #[quickcheck_macros::quickcheck]
    fn prop_always_returns_some(combo: LangCombo) -> bool {
        let router = HyprnoteRouter::default();
        let available = default_available();
        router.select_provider(&combo.0, &available).is_some()
    }

    #[quickcheck_macros::quickcheck]
    fn prop_soniox_always_in_chain(combo: LangCombo) -> bool {
        let router = HyprnoteRouter::default();
        let available = default_available();
        let chain = router.select_provider_chain(&combo.0, &available);
        chain.contains(&Provider::Soniox)
    }
}
