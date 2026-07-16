use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events as _},
    Address, Env,
};

fn setup() -> (Env, MetadataRegistryClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(MetadataRegistry, ());
    let client = MetadataRegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    (env, client, admin)
}

#[test]
fn initialize_and_register_contract() {
    let (env, client, admin) = setup();
    let contract = Address::generate(&env);

    client.initialize(&admin);
    client.register_contract(&admin, &contract);

    assert_eq!(client.get_status(&contract), ContractStatus::Active);
    assert_eq!(client.get_default_contract(), contract);
    client.assert_active(&contract);
}

#[test]
fn rejects_reinitialization_and_duplicate_registration() {
    let (env, client, admin) = setup();
    let contract = Address::generate(&env);

    client.initialize(&admin);
    assert_eq!(
        client.try_initialize(&admin),
        Err(Ok(RegistryError::AlreadyInitialized))
    );

    client.register_contract(&admin, &contract);
    assert_eq!(
        client.try_register_contract(&admin, &contract),
        Err(Ok(RegistryError::ContractAlreadyRegistered))
    );
}

#[test]
fn status_controls_active_assertion() {
    let (env, client, admin) = setup();
    let contract = Address::generate(&env);

    client.initialize(&admin);
    client.register_contract(&admin, &contract);
    client.set_status(&admin, &contract, &ContractStatus::Paused);

    assert_eq!(client.get_status(&contract), ContractStatus::Paused);
    assert_eq!(
        client.try_assert_active(&contract),
        Err(Ok(RegistryError::ContractInactive))
    );
}

#[test]
fn rejects_unknown_contracts_and_wrong_admin() {
    let (env, client, admin) = setup();
    let wrong_admin = Address::generate(&env);
    let contract = Address::generate(&env);

    client.initialize(&admin);
    assert_eq!(
        client.try_get_status(&contract),
        Err(Ok(RegistryError::ContractNotRegistered))
    );
    assert_eq!(
        client.try_register_contract(&wrong_admin, &contract),
        Err(Ok(RegistryError::Unauthorized))
    );
}

#[test]
fn emits_events_for_mutations() {
    let (env, client, admin) = setup();
    let contract = Address::generate(&env);

    client.initialize(&admin);
    assert_eq!(env.events().all().events().len(), 1);

    client.register_contract(&admin, &contract);
    assert_eq!(env.events().all().events().len(), 1);

    client.set_status(&admin, &contract, &ContractStatus::Paused);
    assert_eq!(env.events().all().events().len(), 1);
}
