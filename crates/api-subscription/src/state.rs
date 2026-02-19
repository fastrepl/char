use stripe::Client as StripeClient;

use crate::config::SubscriptionConfig;
use crate::supabase::SupabaseClient;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) config: SubscriptionConfig,
    pub(crate) supabase: SupabaseClient,
    pub(crate) stripe: StripeClient,
}

impl AppState {
    pub(crate) fn new(config: SubscriptionConfig) -> Self {
        let supabase = SupabaseClient::new(
            config.supabase.supabase_url.clone(),
            config.supabase.supabase_anon_key.clone(),
        );

        let stripe = StripeClient::new(&config.stripe.stripe_secret_key);

        Self {
            config,
            supabase,
            stripe,
        }
    }
}
