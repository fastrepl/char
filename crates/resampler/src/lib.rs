mod driver;

pub use driver::RubatoChunkResampler;
pub use rubato::{Async, FixedAsync, PolynomialDegree, Resampler};

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error(transparent)]
    ResampleError(#[from] rubato::ResampleError),
    #[error(transparent)]
    ResamplerConstructionError(#[from] rubato::ResamplerConstructionError),
}
