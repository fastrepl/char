use std::fmt;

#[derive(Debug)]
pub enum Error {
    Io(std::io::Error),
    Fmt(fmt::Error),
    UnsupportedType(String),
}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e)
    }
}

impl From<fmt::Error> for Error {
    fn from(e: fmt::Error) -> Self {
        Self::Fmt(e)
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::Io(e) => write!(f, "IO error: {}", e),
            Error::Fmt(e) => write!(f, "Format error: {}", e),
            Error::UnsupportedType(t) => write!(f, "Unsupported type: {}", t),
        }
    }
}

impl std::error::Error for Error {}
