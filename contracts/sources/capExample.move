module contracts::capExample {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    use std::string::String;


    // any cap should be soul-bound
    struct Cap has key {
        id: UID
    }

    struct Asset has key, store {
        id: UID,
        desctiption: String
    }

    fun init(ctx: &mut TxContext) {
        let cap = Cap {
            id: object::new(ctx)
        };

        transfer::transfer(cap, tx_context::sender(ctx));
    }

    public fun gatedFunction(_: &Cap, desctiption: String, ctx: &mut TxContext): Asset {
        Asset {
            id: object::new(ctx),
            desctiption
        }
    }
}