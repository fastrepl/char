use std::ffi::CStr;

use crate::error::Result;
use crate::response::CactusResponse;

pub(crate) const RESPONSE_BUF_SIZE: usize = 64 * 1024;

pub(crate) fn read_cstr_from_buf(buf: &[u8]) -> String {
    CStr::from_bytes_until_nul(buf)
        .map(|c| c.to_string_lossy().into_owned())
        .unwrap_or_default()
}

pub(crate) fn parse_response_buf(buf: &[u8]) -> Result<CactusResponse> {
    let raw = read_cstr_from_buf(buf);
    Ok(
        serde_json::from_str(&raw).unwrap_or_else(|_| CactusResponse {
            response: raw,
            confidence: 0.0,
            time_to_first_token_ms: 0.0,
            total_time_ms: 0.0,
            prefill_tps: 0.0,
            decode_tps: 0.0,
            prefill_tokens: 0,
            decode_tokens: 0,
            total_tokens: 0,
        }),
    )
}
