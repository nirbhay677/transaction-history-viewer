use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ContractStatus {
    Active,
    Paused,
}

#[contracttype]
pub(crate) enum StorageKey {
    Admin,
    DefaultContract,
    Status(Address),
}
