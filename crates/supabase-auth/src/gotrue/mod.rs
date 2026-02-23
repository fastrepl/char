//! GoTrue client for Supabase authentication.
//!
//! This module provides a Rust equivalent of the `@supabase/auth-js` GoTrueClient,
//! focused on session management, token refresh, and OAuth support for the Tauri desktop app.

mod client;
mod error;
mod storage;
mod types;

pub use client::{GoTrueClient, GoTrueClientConfig};
pub use error::GoTrueError;
pub use storage::{AuthStorage, MemoryStorage};
pub use types::{AuthChangeEvent, Session, SignOutScope, User};
