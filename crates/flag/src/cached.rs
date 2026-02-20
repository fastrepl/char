use std::time::Duration;

use moka::future::Cache;

use crate::{Error, FlagClient, FlagOptions, FlagsResponse};

#[derive(Clone)]
pub struct CachedClient {
    inner: FlagClient,
    cache: Cache<String, FlagsResponse>,
}

pub struct CachedClientBuilder {
    api_key: String,
    ttl: Duration,
    max_capacity: u64,
}

impl CachedClientBuilder {
    fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            ttl: Duration::from_secs(30),
            max_capacity: 10_000,
        }
    }

    pub fn ttl(mut self, ttl: Duration) -> Self {
        self.ttl = ttl;
        self
    }

    pub fn max_capacity(mut self, max_capacity: u64) -> Self {
        self.max_capacity = max_capacity;
        self
    }

    pub fn build(self) -> CachedClient {
        let cache = Cache::builder()
            .time_to_live(self.ttl)
            .max_capacity(self.max_capacity)
            .build();

        CachedClient {
            inner: FlagClient::new(self.api_key),
            cache,
        }
    }
}

impl CachedClient {
    pub fn builder(api_key: impl Into<String>) -> CachedClientBuilder {
        CachedClientBuilder::new(api_key)
    }

    pub async fn get_flags(
        &self,
        distinct_id: &str,
        options: Option<FlagOptions>,
    ) -> Result<FlagsResponse, Error> {
        if options.is_some() {
            return self.inner.get_flags(distinct_id, options).await;
        }

        if let Some(cached) = self.cache.get(distinct_id).await {
            return Ok(cached);
        }

        let flags = self.inner.get_flags(distinct_id, None).await?;
        self.cache
            .insert(distinct_id.to_string(), flags.clone())
            .await;
        Ok(flags)
    }

    pub async fn is_enabled(&self, distinct_id: &str, key: &str) -> bool {
        match self.get_flags(distinct_id, None).await {
            Ok(flags) => flags.is_enabled(key),
            Err(_) => false,
        }
    }
}
