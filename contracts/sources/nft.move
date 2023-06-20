module contracts::nft {
    use std::string::{Self, String};

    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    const PRICE: u64 = 100000;

    const ECoinAmountNotExact: u64 = 0;
    

    struct NFT has key, store {
        id: UID,
        color: String,
        weight: u32,
        text: vector<u8>
    }

    // correct patter
    public fun mint(color: String, weight: u32, ctx: &mut TxContext): NFT {
        let nft = NFT {
            id: object::new(ctx),
            color,
            weight,
            text: b"tangle pattern"
        };
        nft // just return
    }

    // anti-pattern the move function is written without taking into consideration PTB's
    public fun mint_and_transfer(color: String, weight: u32, ctx: &mut TxContext) {
        let nft = NFT {
            id: object::new(ctx),
            color,
            weight,
            text: b"transfered"
        };
        transfer::public_transfer(nft, tx_context::sender(ctx));
    }

    public fun costly_mint(fee: Coin<SUI>, ctx: &mut TxContext): NFT {
        assert!(coin::value<SUI>(&fee) == PRICE, ECoinAmountNotExact);

        // here we transfer the coin back, this will not happen in production code normally
        // usually it will be turned into balanced which will be merged with an existing balance
        // the existing balance would be a field of a shared object that stores proceeds
        transfer::public_transfer(fee, tx_context::sender(ctx));
        let arbitrary_weight: u32 = 88;
        NFT {
            id: object::new(ctx),
            color: string::utf8(b"silver"),
            weight: arbitrary_weight,
            text: b"payed for"
        }
    }

    // Setters

    public fun change_color(nft: &mut NFT, new_color: String) {
        nft.color = new_color;
    }

    public fun change_weight(nft: &mut NFT, new_weight: u32) {
        nft.weight = new_weight;
    }

    public fun change_text(nft: &mut NFT, new_text: vector<u8>) {
        nft.text = new_text;
    }

    // Getters
    public fun color(nft: &NFT): &String {
        &nft.color
    }

    // Good Practice:
    // write a burn/destroy function for any defined owned objects
    public fun burn(nft: NFT) {
        let NFT {id, color: _, weight: _, text: _} = nft;
        object::delete(id);

    }
}