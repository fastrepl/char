use std::sync::Arc;

use hypr_analytics::AnalyticsClient;

use crate::StripeEnv;
use hypr_api_env::SupabaseEnv;

#[derive(Clone)]
pub struct SubscriptionConfig {
    pub supabase: SupabaseEnv,
    pub stripe: StripeEnv,
    pub analytics: Option<Arc<AnalyticsClient>>,
}

impl SubscriptionConfig {
    pub fn new(supabase: &SupabaseEnv, stripe: &StripeEnv) -> Self {
        Self {
            supabase: supabase.clone(),
            stripe: stripe.clone(),
            analytics: None,
        }
    }

    pub fn with_analytics(mut self, analytics: Arc<AnalyticsClient>) -> Self {
        self.analytics = Some(analytics);
        self
    }
}
