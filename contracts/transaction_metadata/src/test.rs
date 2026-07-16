use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events as _, Ledger as _},
    vec, Address, BytesN, Env, String,
};

fn setup() -> (Env, TransactionMetadataClient<'static>, Address, BytesN<32>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(TransactionMetadata, ());
    let client = TransactionMetadataClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let transaction_hash = BytesN::from_array(&env, &[7; 32]);

    (env, client, owner, transaction_hash)
}

fn sample_input(env: &Env) -> MetadataInput {
    MetadataInput {
        note: Some(String::from_str(env, "Reviewed transaction")),
        favorite: true,
        tags: vec![env, String::from_str(env, "personal")],
    }
}

#[test]
fn metadata_lifecycle() {
    let (env, client, owner, transaction_hash) = setup();
    env.ledger().set_timestamp(100);

    let saved = client.save_metadata(&owner, &transaction_hash, &sample_input(&env));
    assert_eq!(saved.created_at, 100);
    assert_eq!(saved.updated_at, 100);
    assert_eq!(client.get_metadata(&owner, &transaction_hash), saved);

    env.ledger().set_timestamp(200);
    let updated_input = MetadataInput {
        note: None,
        favorite: true,
        tags: vec![&env, String::from_str(&env, "tax")],
    };
    let updated = client.update_metadata(&owner, &transaction_hash, &updated_input);
    assert_eq!(updated.created_at, 100);
    assert_eq!(updated.updated_at, 200);
    assert_eq!(updated.note, None);

    client.delete_metadata(&owner, &transaction_hash);
    assert_eq!(
        client.try_get_metadata(&owner, &transaction_hash),
        Err(Ok(ContractError::MetadataNotFound))
    );
}

#[test]
fn records_are_isolated_by_owner() {
    let (env, client, first_owner, transaction_hash) = setup();
    let second_owner = Address::generate(&env);

    client.save_metadata(&first_owner, &transaction_hash, &sample_input(&env));
    assert_eq!(
        client.try_get_metadata(&second_owner, &transaction_hash),
        Err(Ok(ContractError::MetadataNotFound))
    );
}

#[test]
fn rejects_duplicate_records_and_invalid_input() {
    let (env, client, owner, transaction_hash) = setup();
    let input = sample_input(&env);
    client.save_metadata(&owner, &transaction_hash, &input);

    assert_eq!(
        client.try_save_metadata(&owner, &transaction_hash, &input),
        Err(Ok(ContractError::MetadataAlreadyExists))
    );

    let empty_hash = BytesN::from_array(&env, &[8; 32]);
    let empty = MetadataInput {
        note: None,
        favorite: false,
        tags: vec![&env],
    };
    assert_eq!(
        client.try_save_metadata(&owner, &empty_hash, &empty),
        Err(Ok(ContractError::EmptyMetadata))
    );

    let duplicate_tags = MetadataInput {
        note: None,
        favorite: true,
        tags: vec![
            &env,
            String::from_str(&env, "tax"),
            String::from_str(&env, "tax"),
        ],
    };
    assert_eq!(
        client.try_update_metadata(&owner, &transaction_hash, &duplicate_tags),
        Err(Ok(ContractError::DuplicateTag))
    );
}

#[test]
fn mutations_require_owner_authorization() {
    let (env, client, owner, transaction_hash) = setup();
    client.save_metadata(&owner, &transaction_hash, &sample_input(&env));

    let auths = env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths.get(0).expect("authorization must exist").0, owner);
}

#[test]
fn emits_one_event_per_mutation() {
    let (env, client, owner, transaction_hash) = setup();
    let input = sample_input(&env);

    client.save_metadata(&owner, &transaction_hash, &input);
    assert_eq!(env.events().all().events().len(), 1);

    client.update_metadata(&owner, &transaction_hash, &input);
    assert_eq!(env.events().all().events().len(), 1);

    client.delete_metadata(&owner, &transaction_hash);
    assert_eq!(env.events().all().events().len(), 1);
}
