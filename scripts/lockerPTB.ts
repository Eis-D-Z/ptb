import { TransactionBlock, RawSigner } from "@mysten/sui.js";
import getExecStuff from "./utils";
import * as dotenv from "dotenv";
dotenv.config();

const pkgId = process.env.NFT_PKG as string;
const lockerId = process.env.LOCKER_ID as string;

const lock = async (itemId: string, address: string, signer: RawSigner) => {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${pkgId}::locker::lock_item`,
    arguments: [tx.object(itemId), tx.object(lockerId)],
    typeArguments: [`${pkgId}::nft::NFT`],
  });

  tx.setSender(address);

  const response = signer.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForEffectsCert",
  });

  return response;
};

const change = async (nftId: string, address: string, signer: RawSigner) => {
  const tx = new TransactionBlock();

  tx.setSender(address);

  const locker = tx.object(lockerId);

  const NestedResult = tx.moveCall({
    target: `${pkgId}::locker::borrow_item`,
    arguments: [tx.pure(nftId), locker],
    typeArguments: [`${pkgId}::nft::NFT`],
  });

  const new_color = "metallic green";
  tx.moveCall({
    target: `${pkgId}::nft::change_color`,
    arguments: [NestedResult[0], tx.pure(new_color, "string")],
  });

  const new_weight = 250;
  tx.moveCall({
    target: `${pkgId}::nft::change_weight`,
    arguments: [NestedResult[0], tx.pure(new_weight, "u32")],
  });

  const new_text = "changed will borrowing";
  tx.moveCall({
    target: `${pkgId}::nft::change_text`,
    arguments: [NestedResult[0], tx.pure(new_text)],
  });

  tx.moveCall({
    target: `${pkgId}::locker::return_item`,
    arguments: [NestedResult[0], NestedResult[1], locker],
    typeArguments: [`${pkgId}::nft::NFT`],
  });

  const response = await signer.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
    },
  });

  return response;
};

// this will fail
// we are trying to transfer the returned NFT while ignoring the hot potato that also gets returned
// you are welcome to try any combination or method to send the NFT to another address (get it out of the locker)
const fail_to_take = async (
  nftId: string,
  address: string,
  signer: RawSigner
) => {
  const tx = new TransactionBlock();

  tx.setSender(address);

  const locker = tx.object(lockerId);

  const NestedResult = tx.moveCall({
    target: `${pkgId}::locker::borrow_item`,
    arguments: [tx.pure(nftId), locker],
    typeArguments: [`${pkgId}::nft::NFT`],
  });

  tx.transferObjects([NestedResult[0]], tx.pure(address));
  const response = await signer.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
    },
  });

  return response;
};

// test of return reference anti-pattern
// here the first move call returns a reference and PTB's don't support that yet
const test_reference_borrow = async (
  itemId: string,
  address: string,
  signer: RawSigner
) => {
  const tx = new TransactionBlock();

  tx.setSender(address);
  const reference = tx.moveCall({
    target: `${pkgId}::locker::anti_borrow_item`,
    arguments: [tx.pure(itemId, "address"), tx.object(lockerId)],
    typeArguments: [`${pkgId}::nft::NFT`],
  });

  tx.moveCall({
    target: `${pkgId}::nft::change_color`,
    arguments: [reference, tx.pure("scalet", "string")],
  });

  const response = await signer.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
    },
  });
  return response;
};

const main = async () => {
  const { address, provider, signer } = getExecStuff();
  let result;

  // lock
  // change
  const itemId =
    "0x9023f13a3d4d0edb90dbb14da1edca570306868b8bad8d0000e08772908d4923";
  // result = await lock(itemId, address, signer);
  // result = await change(itemId, address, signer);
  // result = await fail_to_take(itemId, address, signer);

  //call mint_and_change
  //   result = await mint_and_change(color, weight, address, signer);

  // call bad example
  //   result = await bad_call(color, weight, address, signer);

  // reference anti-pattern
  result = await test_reference_borrow(itemId, address, signer);
  console.log(JSON.stringify(result));
};

main();
