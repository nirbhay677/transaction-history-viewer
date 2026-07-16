use soroban_sdk::{contractclient, contracterror, contracttype, Address, Env};

#[contracttype]
pub(crate) enum RegistryStorageKey {
    Registry,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RegistryError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    ContractAlreadyRegistered = 4,
    ContractNotRegistered = 5,
    ContractInactive = 6,
    DefaultContractNotSet = 7,
}

#[contractclient(name = "MetadataRegistryClient")]
#[allow(dead_code)]
pub trait MetadataRegistry {
    fn assert_active(env: Env, contract: Address) -> Result<(), RegistryError>;
}
