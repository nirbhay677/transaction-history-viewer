use crate::{ContractError, MetadataInput};

const MAX_NOTE_BYTES: u32 = 512;
const MAX_TAGS: u32 = 10;
const MAX_TAG_BYTES: u32 = 32;

pub(crate) fn validate_metadata(input: &MetadataInput) -> Result<(), ContractError> {
    if let Some(note) = &input.note {
        if note.is_empty() {
            return Err(ContractError::EmptyNote);
        }
        if note.len() > MAX_NOTE_BYTES {
            return Err(ContractError::NoteTooLong);
        }
    }

    if input.tags.len() > MAX_TAGS {
        return Err(ContractError::TooManyTags);
    }

    for index in 0..input.tags.len() {
        let tag = input.tags.get(index).expect("tag index must be in bounds");
        if tag.is_empty() {
            return Err(ContractError::EmptyTag);
        }
        if tag.len() > MAX_TAG_BYTES {
            return Err(ContractError::TagTooLong);
        }

        for previous_index in 0..index {
            let previous = input
                .tags
                .get(previous_index)
                .expect("tag index must be in bounds");
            if tag == previous {
                return Err(ContractError::DuplicateTag);
            }
        }
    }

    if input.note.is_none() && !input.favorite && input.tags.is_empty() {
        return Err(ContractError::EmptyMetadata);
    }

    Ok(())
}
