use soroban_sdk::contracterror;

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
