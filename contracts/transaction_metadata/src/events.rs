use soroban_sdk::{contractevent, Address, BytesN};

#[contractevent]
pub struct MetadataSaved {
    #[topic]
    pub owner: Address,
    #[topic]
    pub transaction_hash: BytesN<32>,
    pub favorite: bool,
    pub tag_count: u32,
    pub timestamp: u64,
}

#[contractevent]
pub struct MetadataUpdated {
    #[topic]
    pub owner: Address,
    #[topic]
    pub transaction_hash: BytesN<32>,
    pub favorite: bool,
    pub tag_count: u32,
    pub timestamp: u64,
}

#[contractevent]
pub struct MetadataDeleted {
    #[topic]
    pub owner: Address,
    #[topic]
    pub transaction_hash: BytesN<32>,
    pub timestamp: u64,
}
