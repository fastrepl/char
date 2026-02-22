#[derive(Clone, Debug)]
pub struct CactusConfig {
    pub cloud_handoff: bool,
    pub min_chunk_sec: f32,
}

impl Default for CactusConfig {
    fn default() -> Self {
        Self {
            cloud_handoff: true,
            min_chunk_sec: 2.5,
        }
    }
}
