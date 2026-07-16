#![no_std]

mod error;
mod events;
mod registry;
mod types;
mod validation;

pub use error::ContractError;
pub use types::{Metadata, MetadataInput};

use events::{MetadataDeleted, MetadataSaved, MetadataUpdated};
use registry::{MetadataRegistryClient, RegistryStorageKey};
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};
use types::StorageKey;
use validation::validate_metadata;

const RECORD_TTL_THRESHOLD: u32 = 172_800;
const RECORD_TTL_EXTEND_TO: u32 = 535_680;

#[contract]
pub struct TransactionMetadata;

#[contractimpl]
impl TransactionMetadata {
    pub fn __constructor(env: Env, registry: Address) {
        env.storage()
            .instance()
            .set(&RegistryStorageKey::Registry, &registry);
    }

    pub fn save_metadata(
        env: Env,
        owner: Address,
        transaction_hash: BytesN<32>,
        input: MetadataInput,
    ) -> Result<Metadata, ContractError> {
        owner.require_auth();
        validate_metadata(&input)?;
        assert_registry_active(&env)?;

        let key = StorageKey::Metadata(owner.clone(), transaction_hash.clone());
        if env.storage().persistent().has(&key) {
            return Err(ContractError::MetadataAlreadyExists);
        }

        let timestamp = env.ledger().timestamp();
        let metadata = Metadata {
            note: input.note,
            favorite: input.favorite,
            tags: input.tags,
            created_at: timestamp,
            updated_at: timestamp,
        };

        env.storage().persistent().set(&key, &metadata);
        extend_record_ttl(&env, &key);

        MetadataSaved {
            owner,
            transaction_hash,
            favorite: metadata.favorite,
            tag_count: metadata.tags.len(),
            timestamp,
        }
        .publish(&env);

        Ok(metadata)
    }

    pub fn get_metadata(
        env: Env,
        owner: Address,
        transaction_hash: BytesN<32>,
    ) -> Result<Metadata, ContractError> {
        let key = StorageKey::Metadata(owner, transaction_hash);
        let metadata = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::MetadataNotFound)?;

        extend_record_ttl(&env, &key);
        Ok(metadata)
    }

    pub fn update_metadata(
        env: Env,
        owner: Address,
        transaction_hash: BytesN<32>,
        input: MetadataInput,
    ) -> Result<Metadata, ContractError> {
        owner.require_auth();
        validate_metadata(&input)?;
        assert_registry_active(&env)?;

        let key = StorageKey::Metadata(owner.clone(), transaction_hash.clone());
        let existing: Metadata = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::MetadataNotFound)?;

        let timestamp = env.ledger().timestamp();
        let metadata = Metadata {
            note: input.note,
            favorite: input.favorite,
            tags: input.tags,
            created_at: existing.created_at,
            updated_at: timestamp,
        };

        env.storage().persistent().set(&key, &metadata);
        extend_record_ttl(&env, &key);

        MetadataUpdated {
            owner,
            transaction_hash,
            favorite: metadata.favorite,
            tag_count: metadata.tags.len(),
            timestamp,
        }
        .publish(&env);

        Ok(metadata)
    }

    pub fn delete_metadata(
        env: Env,
        owner: Address,
        transaction_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        owner.require_auth();

        let key = StorageKey::Metadata(owner.clone(), transaction_hash.clone());
        if !env.storage().persistent().has(&key) {
            return Err(ContractError::MetadataNotFound);
        }

        env.storage().persistent().remove(&key);

        MetadataDeleted {
            owner,
            transaction_hash,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);

        Ok(())
    }
}

fn extend_record_ttl(env: &Env, key: &StorageKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, RECORD_TTL_THRESHOLD, RECORD_TTL_EXTEND_TO);
}

fn assert_registry_active(env: &Env) -> Result<(), ContractError> {
    let registry: Address = env
        .storage()
        .instance()
        .get(&RegistryStorageKey::Registry)
        .ok_or(ContractError::RegistryInactive)?;
    let current_contract = env.current_contract_address();

    match MetadataRegistryClient::new(env, &registry).try_assert_active(&current_contract) {
        Ok(Ok(())) => Ok(()),
        _ => Err(ContractError::RegistryInactive),
    }
}

#[cfg(test)]
mod test;
