use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    MetadataAlreadyExists = 1,
    MetadataNotFound = 2,
    EmptyMetadata = 3,
    EmptyNote = 4,
    NoteTooLong = 5,
    TooManyTags = 6,
    EmptyTag = 7,
    TagTooLong = 8,
    DuplicateTag = 9,
}
