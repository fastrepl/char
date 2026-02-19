use crate::StripeEnv;
use hypr_api_env::SupabaseEnv;

#[derive(Clone)]
pub struct SubscriptionConfig {
    pub supabase: SupabaseEnv,
    pub stripe: StripeEnv,
}

impl SubscriptionConfig {
    pub fn new(supabase: &SupabaseEnv, stripe: &StripeEnv) -> Self {
        Self {
            supabase: supabase.clone(),
            stripe: stripe.clone(),
        }
    }
}
