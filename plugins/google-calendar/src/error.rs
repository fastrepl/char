use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("not authenticated")]
    NotAuthenticated,
    #[error("invalid auth header: {0}")]
    InvalidAuthHeader(#[from] reqwest::header::InvalidHeaderValue),
    #[error("http client error: {0}")]
    HttpClient(#[from] reqwest::Error),
    #[error("auth plugin error: {0}")]
    Auth(String),
    #[error("api error: {0}")]
    Api(String),
}

impl serde::Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

impl specta::Type for Error {
    fn inline(_type_map: &mut specta::TypeMap, _generics: specta::Generics) -> specta::DataType {
        specta::DataType::Primitive(specta::datatype::PrimitiveType::String)
    }
}
