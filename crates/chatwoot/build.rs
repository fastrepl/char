use std::collections::{BTreeSet, VecDeque};

use serde_json::Value;

const ALLOWED_PATH_PREFIXES: &[&str] = &[
    "/public/api/v1/inboxes/",
    "/api/v1/accounts/{account_id}/conversations",
    "/api/v1/accounts/{account_id}/contacts",
    "/api/v1/accounts/{account_id}/inboxes",
    "/api/v1/accounts/{account_id}/agent_bots",
    "/api/v1/accounts/{account_id}/webhooks",
];

fn main() {
    let src = concat!(env!("CARGO_MANIFEST_DIR"), "/swagger.json");
    println!("cargo:rerun-if-changed={src}");

    let raw = std::fs::read_to_string(src).expect("failed to read swagger.json");
    let mut spec: Value = serde_json::from_str(&raw).expect("invalid JSON");

    filter_spec(&mut spec);

    let gen_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("openapi.gen.json");
    std::fs::write(&gen_path, serde_json::to_string_pretty(&spec).unwrap()).unwrap();

    let openapi: openapiv3::OpenAPI =
        serde_json::from_value(spec).expect("filtered spec is not valid OpenAPI");
    let tokens = progenitor::Generator::default()
        .generate_tokens(&openapi)
        .expect("progenitor code generation failed");

    let ast = syn::parse2(tokens).expect("generated code failed to parse");
    let content = prettyplease::unparse(&ast);
    let out_path = std::path::Path::new(&std::env::var("OUT_DIR").unwrap()).join("codegen.rs");
    std::fs::write(&out_path, content).unwrap();
}

// ---------------------------------------------------------------------------
// Spec filtering pipeline
// ---------------------------------------------------------------------------

fn filter_spec(spec: &mut Value) {
    retain_matching_paths(spec);
    normalize_responses(spec);
    flatten_all_of(spec);
    remove_unreferenced_schemas(spec);
}

fn retain_matching_paths(spec: &mut Value) {
    let Some(paths) = spec.get_mut("paths").and_then(Value::as_object_mut) else {
        return;
    };
    paths.retain(|key, _| {
        ALLOWED_PATH_PREFIXES
            .iter()
            .any(|prefix| key.starts_with(prefix))
    });
}

/// Progenitor requires at most one typed response per operation.
/// - Strip content bodies from 204 responses (shouldn't carry a body).
/// - Strip content bodies from all error (non-2xx) responses so that
///   inconsistent error schemas don't trip the assertion.
fn normalize_responses(spec: &mut Value) {
    for_each_operation(spec, |op| {
        let Some(responses) = op.get_mut("responses").and_then(Value::as_object_mut) else {
            return;
        };
        for (code, resp) in responses.iter_mut() {
            let dominated = code == "204" || !code.starts_with('2');
            if dominated {
                if let Some(obj) = resp.as_object_mut() {
                    obj.remove("content");
                }
            }
        }
    });
}

/// Progenitor cannot handle `allOf` compositions (it panics with
/// "response_types.len() <= 1"). Walk the entire tree and replace every
/// `allOf` node with its last `$ref` member, which is typically the primary
/// type (the first tends to be `generic_id` or similar).
fn flatten_all_of(value: &mut Value) {
    match value {
        Value::Object(map) => {
            if let Some(chosen_ref) = extract_allof_ref(map) {
                map.clear();
                map.insert("$ref".into(), Value::String(chosen_ref));
                return;
            }
            for v in map.values_mut() {
                flatten_all_of(v);
            }
        }
        Value::Array(arr) => {
            for v in arr {
                flatten_all_of(v);
            }
        }
        _ => {}
    }
}

fn extract_allof_ref(map: &serde_json::Map<String, Value>) -> Option<String> {
    let items = map.get("allOf")?.as_array()?;
    items
        .iter()
        .rev()
        .find_map(|item| item.get("$ref")?.as_str().map(String::from))
}

// ---------------------------------------------------------------------------
// Dead-schema removal
// ---------------------------------------------------------------------------

fn remove_unreferenced_schemas(spec: &mut Value) {
    let referenced = transitively_referenced_schemas(spec);
    let Some(schemas) = spec
        .pointer_mut("/components/schemas")
        .and_then(Value::as_object_mut)
    else {
        return;
    };
    schemas.retain(|key, _| referenced.contains(key));
}

/// BFS from every `$ref` found under `paths`, expanding through schema
/// definitions until the closure is complete.
fn transitively_referenced_schemas(spec: &Value) -> BTreeSet<String> {
    let mut visited = BTreeSet::new();
    let mut queue = VecDeque::new();

    if let Some(paths) = spec.get("paths") {
        collect_schema_refs(paths, &mut queue);
    }

    let schemas = spec
        .pointer("/components/schemas")
        .and_then(Value::as_object);

    while let Some(name) = queue.pop_front() {
        if !visited.insert(name.clone()) {
            continue;
        }
        if let Some(schema) = schemas.and_then(|s| s.get(&name)) {
            let mut nested = VecDeque::new();
            collect_schema_refs(schema, &mut nested);
            queue.extend(nested.into_iter().filter(|n| !visited.contains(n)));
        }
    }

    visited
}

fn collect_schema_refs(value: &Value, out: &mut VecDeque<String>) {
    match value {
        Value::Object(map) => {
            if let Some(Value::String(r)) = map.get("$ref") {
                if let Some(name) = r.strip_prefix("#/components/schemas/") {
                    out.push_back(name.to_string());
                }
            }
            for v in map.values() {
                collect_schema_refs(v, out);
            }
        }
        Value::Array(arr) => {
            for v in arr {
                collect_schema_refs(v, out);
            }
        }
        _ => {}
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn for_each_operation(spec: &mut Value, mut f: impl FnMut(&mut Value)) {
    let Some(paths) = spec.get_mut("paths").and_then(Value::as_object_mut) else {
        return;
    };
    for item in paths.values_mut() {
        let Some(item) = item.as_object_mut() else {
            continue;
        };
        for method in ["get", "post", "put", "patch", "delete"] {
            if let Some(op) = item.get_mut(method) {
                f(op);
            }
        }
    }
}
