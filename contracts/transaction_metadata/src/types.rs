use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MetadataInput {
    pub note: Option<String>,
    pub favorite: bool,
    pub tags: Vec<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Metadata {
    pub note: Option<String>,
    pub favorite: bool,
    pub tags: Vec<String>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
pub(crate) enum StorageKey {
    Metadata(Address, BytesN<32>),
}
