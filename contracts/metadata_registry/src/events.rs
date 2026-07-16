use crate::ContractStatus;
use soroban_sdk::{contractevent, Address};

#[contractevent]
pub struct RegistryInitialized {
    #[topic]
    pub admin: Address,
    pub timestamp: u64,
}

#[contractevent]
pub struct ContractRegistered {
    #[topic]
    pub contract: Address,
    pub admin: Address,
    pub timestamp: u64,
}

#[contractevent]
pub struct ContractStatusChanged {
    #[topic]
    pub contract: Address,
    pub status: ContractStatus,
    pub admin: Address,
    pub timestamp: u64,
}
