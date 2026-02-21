pub trait IdGenerator: Send + Sync {
    fn next_id(&mut self) -> String;
}

pub struct UuidIdGen;

impl Default for UuidIdGen {
    fn default() -> Self {
        Self
    }
}

impl IdGenerator for UuidIdGen {
    fn next_id(&mut self) -> String {
        uuid::Uuid::new_v4().to_string()
    }
}

/// Deterministic sequential ID generator for tests and golden-file snapshots
/// where stable, reproducible word IDs are required.
pub struct SequentialIdGen(u64);

impl SequentialIdGen {
    pub fn new() -> Self {
        Self(0)
    }
}

impl Default for SequentialIdGen {
    fn default() -> Self {
        Self::new()
    }
}

impl IdGenerator for SequentialIdGen {
    fn next_id(&mut self) -> String {
        let id = self.0;
        self.0 += 1;
        id.to_string()
    }
}
