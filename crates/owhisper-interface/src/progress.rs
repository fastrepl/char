crate::common_derives! {
    #[serde(rename_all = "snake_case")]
    pub enum InferencePhase {
        Transcribing,
        Prefill,
        Decoding,
    }
}

crate::common_derives! {
    pub struct InferenceProgress {
        /// Fraction of work completed, in range 0.0..=1.0.
        pub percentage: f64,

        /// Optional text fragment produced so far.
        pub partial_text: Option<String>,

        pub phase: InferencePhase,
    }
}
