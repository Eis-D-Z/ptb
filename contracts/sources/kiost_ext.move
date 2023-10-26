module contracts::kiosk_ext {
    use sui::bag;
    use sui::kiosk::{Kiosk, KioskOwnerCap};
    use sui::kiosk_extension as kext;
    use sui::object::{Self, ID};
    use sui::tx_context::TxContext;

    use contracts::nft::NFT;

    struct NFTExt has drop {}

    public fun add_kiosk_extension(kiosk: &mut Kiosk, cap: &KioskOwnerCap, ctx: &mut TxContext) {
        kext::add(NFTExt {}, kiosk, cap, 0, ctx); // may not lock, may not place
    }

    public fun place_in_extension(nft: NFT, kiosk: &mut Kiosk) {
        bag::add<ID, NFT>(
            kext::storage_mut(NFTExt{}, kiosk),
            object::id<NFT>(&nft),
            nft
        );
    }

    public fun take_from_extension(key: ID, kiosk: &mut Kiosk): NFT {
        bag::remove<ID, NFT>(
            kext::storage_mut(NFTExt{}, kiosk),
            key
        )
    }

}

#[test_only]
module contracts::ext_tests {
    use sui::kiosk::{Self, Kiosk};
    use sui::object::{Self, ID};
    use sui::test_scenario as ts;
    use sui::transfer;

    use std::string;

    use contracts::nft::{Self, NFT};
    use contracts::kiosk_ext;

    const USER: address = @0x123;

    #[test]
    public fun place_and_take() {
        let _asset_id: ID = object::id_from_address(@0x12345678123456781234567812345678);
        let scenario = ts::begin(USER);
        // create new kiosk with extension
        {
            let (kiosk, cap) = kiosk::new(ts::ctx(&mut scenario));
            kiosk_ext::add_kiosk_extension(&mut kiosk, &cap, ts::ctx(&mut scenario));
            transfer::public_share_object(kiosk);
            transfer::public_transfer(cap, USER);
        };

        //mint an NFT
        ts::next_tx(&mut scenario, USER);
        {
            let asset = nft::mint(string::utf8(b"orange"), 40, ts::ctx(&mut scenario));
            _asset_id = object::last_created(ts::ctx(&mut scenario));
            transfer::public_transfer(asset, USER);
        };

        // place in storage
        ts::next_tx(&mut scenario, USER);
        {
            let kiosk = ts::take_shared<Kiosk>(&scenario);
            let asset = ts::take_from_sender<NFT>(&scenario);
            
            kiosk_ext::place_in_extension(asset, &mut kiosk);
            ts::return_shared<Kiosk>(kiosk);
        };

        // take from storage
        ts::next_tx(&mut scenario, USER);
        {
            let kiosk = ts::take_shared<Kiosk>(&scenario);
            let asset = kiosk_ext::take_from_extension(_asset_id, &mut kiosk);

            transfer::public_transfer(asset, USER);
            ts::return_shared<Kiosk>(kiosk);          
        };

        ts::end(scenario);
    }
}