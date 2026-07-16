# Transaction History Viewer Contracts

This directory is the Rust workspace for the project's Soroban smart contracts.

## Current contract

`transaction_metadata` is a minimal, buildable contract foundation. It intentionally
exports no contract functions and contains no business logic yet.

Future implementation is expected to support transaction owners who want to:

- save personal notes for a transaction;
- mark a transaction as a favorite; and
- assign custom tags.

The data model, authorization rules, storage strategy, events, error types, and
public contract interface will be designed during the implementation phase.

## Structure

```text
.
|-- Cargo.toml
|-- README.md
`-- transaction_metadata/
    |-- Cargo.toml
    |-- Makefile
    `-- src/
        `-- lib.rs
```

## Build

From this directory, run:

```sh
stellar contract build
```

The optimized Wasm artifact is written beneath `target/wasm32v1-none/release/`.
