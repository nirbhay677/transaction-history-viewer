#![no_std]

mod error;
mod events;
mod types;

pub use error::RegistryError;
pub use types::ContractStatus;

use events::{ContractRegistered, ContractStatusChanged, RegistryInitialized};
use soroban_sdk::{contract, contractimpl, Address, Env};
use types::StorageKey;

const INSTANCE_TTL_THRESHOLD: u32 = 172_800;
const INSTANCE_TTL_EXTEND_TO: u32 = 535_680;
const STATUS_TTL_THRESHOLD: u32 = 172_800;
const STATUS_TTL_EXTEND_TO: u32 = 535_680;

#[contract]
pub struct MetadataRegistry;

#[contractimpl]
impl MetadataRegistry {
    pub fn initialize(env: Env, admin: Address) -> Result<(), RegistryError> {
        if env.storage().instance().has(&StorageKey::Admin) {
            return Err(RegistryError::AlreadyInitialized);
        }

        admin.require_auth();
        env.storage().instance().set(&StorageKey::Admin, &admin);
        extend_instance_ttl(&env);

        RegistryInitialized {
            admin,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);

        Ok(())
    }

    pub fn register_contract(
        env: Env,
        admin: Address,
        contract: Address,
    ) -> Result<(), RegistryError> {
        require_admin(&env, &admin)?;

        let status_key = StorageKey::Status(contract.clone());
        if env.storage().persistent().has(&status_key) {
            return Err(RegistryError::ContractAlreadyRegistered);
        }

        env.storage()
            .persistent()
            .set(&status_key, &ContractStatus::Active);
        env.storage()
            .instance()
            .set(&StorageKey::DefaultContract, &contract);
        extend_status_ttl(&env, &status_key);
        extend_instance_ttl(&env);

        ContractRegistered {
            contract,
            admin,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);

        Ok(())
    }

    pub fn set_status(
        env: Env,
        admin: Address,
        contract: Address,
        status: ContractStatus,
    ) -> Result<(), RegistryError> {
        require_admin(&env, &admin)?;

        let status_key = StorageKey::Status(contract.clone());
        if !env.storage().persistent().has(&status_key) {
            return Err(RegistryError::ContractNotRegistered);
        }

        env.storage().persistent().set(&status_key, &status);
        extend_status_ttl(&env, &status_key);
        extend_instance_ttl(&env);

        ContractStatusChanged {
            contract,
            status,
            admin,
            timestamp: env.ledger().timestamp(),
        }
        .publish(&env);

        Ok(())
    }

    pub fn get_status(env: Env, contract: Address) -> Result<ContractStatus, RegistryError> {
        ensure_initialized(&env)?;

        let status_key = StorageKey::Status(contract);
        let status = env
            .storage()
            .persistent()
            .get(&status_key)
            .ok_or(RegistryError::ContractNotRegistered)?;
        extend_status_ttl(&env, &status_key);
        extend_instance_ttl(&env);

        Ok(status)
    }

    pub fn get_default_contract(env: Env) -> Result<Address, RegistryError> {
        ensure_initialized(&env)?;
        let contract = env
            .storage()
            .instance()
            .get(&StorageKey::DefaultContract)
            .ok_or(RegistryError::DefaultContractNotSet)?;
        extend_instance_ttl(&env);

        Ok(contract)
    }

    pub fn assert_active(env: Env, contract: Address) -> Result<(), RegistryError> {
        match Self::get_status(env, contract)? {
            ContractStatus::Active => Ok(()),
            ContractStatus::Paused => Err(RegistryError::ContractInactive),
        }
    }
}

fn ensure_initialized(env: &Env) -> Result<(), RegistryError> {
    if env.storage().instance().has(&StorageKey::Admin) {
        Ok(())
    } else {
        Err(RegistryError::NotInitialized)
    }
}

fn require_admin(env: &Env, admin: &Address) -> Result<(), RegistryError> {
    let stored_admin: Address = env
        .storage()
        .instance()
        .get(&StorageKey::Admin)
        .ok_or(RegistryError::NotInitialized)?;

    admin.require_auth();
    if *admin != stored_admin {
        return Err(RegistryError::Unauthorized);
    }

    Ok(())
}

fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);
}

fn extend_status_ttl(env: &Env, key: &StorageKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, STATUS_TTL_THRESHOLD, STATUS_TTL_EXTEND_TO);
}

#[cfg(test)]
mod test;
