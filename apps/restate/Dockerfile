# syntax=docker/dockerfile:1

ARG RUST_VERSION=1.93.0

FROM rust:${RUST_VERSION}-bookworm AS planner
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-chef --locked
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN sed -i '/^members = \[/,/^\]/c\members = ["apps/restate", "crates/*"]' Cargo.toml
COPY crates crates
COPY apps/restate/Cargo.toml apps/restate/Cargo.toml
RUN mkdir -p apps/restate/src && echo "fn main() {}" > apps/restate/src/main.rs
RUN cargo chef prepare --recipe-path recipe.json

FROM rust:${RUST_VERSION}-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-chef sccache --locked
ENV RUSTC_WRAPPER=sccache \
    SCCACHE_DIR=/sccache
WORKDIR /app
COPY --from=planner /app/recipe.json recipe.json
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=$SCCACHE_DIR,sharing=locked \
    cargo chef cook --release --recipe-path recipe.json -p restate
COPY Cargo.toml Cargo.lock ./
RUN sed -i '/^members = \[/,/^\]/c\members = ["apps/restate", "crates/*"]' Cargo.toml
COPY crates crates
COPY apps/restate apps/restate
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/usr/local/cargo/git,sharing=locked \
    --mount=type=cache,target=$SCCACHE_DIR,sharing=locked \
    cargo build --release -p restate

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -d /nonexistent -s /usr/sbin/nologin -M appuser
COPY --from=build --chown=appuser:appgroup /app/target/release/restate /usr/local/bin/restate
USER appuser
WORKDIR /app
EXPOSE 9080
ENTRYPOINT ["/usr/local/bin/restate"]
