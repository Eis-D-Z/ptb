module contracts::locker{
    use sui::dynamic_object_field as dof;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};


    const EWrongItemReturned: u64 = 0;

    struct MustDestroyThis {
        item_id: address,
        owner: address
    }

    struct Locker has key, store {
        id: UID
    }

    fun init (ctx: &mut TxContext) {
        let locker = Locker {
            id: object::new(ctx)
        };

        transfer::public_share_object(locker);
    }


    public fun lock_item<T: key+store> (item: T, locker: &mut Locker, ctx: &mut TxContext) {
        dof::add<address, T>(&mut locker.id, tx_context::sender(ctx), item);
    }

    public fun borrow_item<T: key+store>(owner: address, locker: &mut Locker): (T, MustDestroyThis) {
        let item = dof::remove<address, T>(&mut locker.id, owner);
        let hot_potato = MustDestroyThis{
            item_id: object::id_address(&item),
            owner
        };

        (item, hot_potato)
    }

    public fun return_item<T: key+store>(item: T, hot_potato: MustDestroyThis) {
        let MustDestroyThis {item_id, owner} = hot_potato;
        let actual_id: address = object::id_address(&item); 
        assert!(item_id == actual_id, EWrongItemReturned);
        
        // In some cases it might make sense for the item to be sent to the address.
        // In those particular instances it is recommended to use transfer::public_transfer
        // to make sure the item goes to the correct address (eg: the one written in the hot potato).
        transfer::public_transfer(item, owner);
    }

    // anti-pattern: PTB's can't work yet with references
    public fun anti_borrow_item<T: key+store>(item_id: address, locker: &mut Locker): &mut T {
        dof::borrow_mut<address, T>(&mut locker.id, item_id)
    } 

    #[test_only]
    public fun init_for_test(ctx: &mut TxContext) {
        init(ctx);
    }

}

#[test_only]
module contracts::locker_tests {
    use std::string;

    use sui::test_scenario as ts;

    use contracts::nft::{Self, NFT};
    use contracts::locker::{Self, Locker};

    const DEGEN: address = @0xDEF;
    // const ITEM_ID: address = @0x34401905bebdf8c04f3cd5f04f442a39372c8dc321c29edfb4f9cb30b23ab96;

    const EWrongColor:u64 = 0;

    #[test]
    public fun test(){
        let scenario = ts::begin(DEGEN);
        let weight: u32 = 8;
        nft::mint_and_transfer(string::utf8(b"light blue"), weight, ts::ctx(&mut scenario));
        locker::init_for_test(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, DEGEN);
        {
            let obj = ts::take_from_sender<NFT>(&mut scenario);
            let locker = ts::take_shared<Locker>(&mut scenario);
            locker::lock_item<NFT>(obj, &mut locker, ts::ctx(&mut scenario));
            ts::return_shared(locker);
        };

        ts::next_tx(&mut scenario, DEGEN);
        {
            let locker = ts::take_shared<Locker>(&mut scenario);
            let ref = locker::anti_borrow_item<NFT>(DEGEN, &mut locker);
            nft::change_color(ref, string::utf8(b"azure"));
            ts::return_shared(locker);
        };
        
        ts::next_tx(&mut scenario, DEGEN);
        {
            let locker = ts::take_shared<Locker>(&mut scenario);
            let (obj, potato) = locker::borrow_item<NFT>(DEGEN, &mut locker);
            assert!(string::utf8(b"azure") == *nft::color(&obj), EWrongColor);
            locker::return_item<NFT>(obj, potato);
            ts::return_shared(locker);
        };

        ts::end(scenario);
    }
}