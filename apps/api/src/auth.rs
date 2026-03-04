use std::collections::BTreeMap;

use axum::{extract::Request, middleware::Next, response::Response};

use hypr_api_auth::AuthContext;
pub use hypr_api_auth::{AuthState, optional_auth, require_auth};

const DEVICE_FINGERPRINT_HEADER: &str = "x-device-fingerprint";

pub async fn sentry_and_analytics(mut request: Request, next: Next) -> Response {
    let device_fingerprint = request
        .headers()
        .get(DEVICE_FINGERPRINT_HEADER)
        .and_then(|h| h.to_str().ok())
        .map(String::from);

    if let Some(auth) = request.extensions().get::<AuthContext>() {
        sentry::configure_scope(|scope| {
            scope.set_user(Some(sentry::User {
                id: device_fingerprint.clone(),
                email: auth.claims.email.clone(),
                username: Some(auth.claims.sub.clone()),
                ..Default::default()
            }));
            scope.set_tag("user.id", &auth.claims.sub);

            let mut ctx = BTreeMap::new();
            ctx.insert(
                "entitlements".into(),
                sentry::protocol::Value::Array(
                    auth.claims
                        .entitlements
                        .iter()
                        .map(|e| sentry::protocol::Value::String(e.clone()))
                        .collect(),
                ),
            );
            scope.set_context("user_claims", sentry::protocol::Context::Other(ctx));
        });

        let user_id = auth.claims.sub.clone();
        request
            .extensions_mut()
            .insert(hypr_analytics::AuthenticatedUserId(user_id));
    }

    if let Some(fingerprint) = device_fingerprint {
        request
            .extensions_mut()
            .insert(hypr_analytics::DeviceFingerprint(fingerprint));
    }

    next.run(request).await
}
