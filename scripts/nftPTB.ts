import { TransactionBlock } from "@mysten/sui.js/transactions";
import { getClient, getSponsorData } from "./utils";
import * as dotenv from "dotenv";
import { SuiClient } from "@mysten/sui.js/dist/cjs/client";
import { Ed25519Keypair } from "@mysten/sui.js/dist/cjs/keypairs/ed25519";
dotenv.config();

const pkgId = process.env.NFT_PKG as string;

const mint = async (
  color: string,
  weight: number,
  address: string,
  keypair: Ed25519Keypair,
  client: SuiClient
) => {
  const tx = new TransactionBlock();

  tx.setSender(address);

  const nft = tx.moveCall({
    target: `${pkgId}::nft::mint`,
    arguments: [tx.pure(color, "string"), tx.pure(weight, "u32")],
    typeArguments: [],
  });

  console.log(nft);

  tx.transferObjects([nft], tx.pure(address));

  const response = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
    },
    signer: keypair,
  });

  return response;
};

const mint_with_exact_payment = async (
  address: string,
  signer: Ed25519Keypair,
  client: SuiClient
) => {
  const exactPaymentInMIST = 100000;
  const tx = new TransactionBlock();

  tx.setSender(address);
  // tx.setGasPayment([])
  const fee = tx.splitCoins(tx.gas, [tx.pure(exactPaymentInMIST)]);
  const nft = tx.moveCall({
    target: `${pkgId}::nft::costly_mint`,
    arguments: [fee],
  });
  tx.transferObjects([nft], tx.pure(address));

  const response = client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showBalanceChanges: true,
      showEffects: true,
    },
    signer,
  });
  return response;
};

const mint_and_change = async (
  color: string,
  weight: number,
  address: string,
  signer: Ed25519Keypair,
  client: SuiClient
) => {
  const tx = new TransactionBlock();

  tx.setSender(address);

  const nft = tx.moveCall({
    target: `${pkgId}::nft::mint`,
    arguments: [tx.pure(color, "string"), tx.pure(weight, "u32")],
    typeArguments: [],
  });

  const new_color = "purple";
  tx.moveCall({
    target: `${pkgId}::nft::change_color`,
    arguments: [nft, tx.pure(new_color, "string")],
  });

  const new_weight = 996;
  tx.moveCall({
    target: `${pkgId}::nft::change_weight`,
    arguments: [nft, tx.pure(new_weight, "u32")],
  });

  const new_text = "changed in one tx";
  tx.moveCall({
    target: `${pkgId}::nft::change_text`,
    arguments: [nft, tx.pure(new_text)],
  });

  tx.transferObjects([nft], tx.pure(address));

  const response = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
    },
    signer,
  });

  return response;
};

// this will fail because there is no nft returned by the move call
// it would work if we remove the last command
const bad_call = async (
  color: string,
  weight: number,
  address: string,
  signer: Ed25519Keypair,
  client: SuiClient
) => {
  const tx = new TransactionBlock();

  tx.setSender(address);

  const nft = tx.moveCall({
    target: `${pkgId}::nft::mint_and_transfer`,
    arguments: [tx.pure(color, "string"), tx.pure(weight, "u32")],
    typeArguments: [],
  });

  // no nft to use
  // tx.transferObjects([nft], tx.pure(address));

  const response = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
    },
    signer,
  });

  return response;
};

// anti-pattern: Do many single mints
// this might get rate limited on public fullnodes
// too slow
// this might result in locked gas coins if coin management is not implemented
const mass_mint_wrong = async (
  address: string,
  signer: Ed25519Keypair,
  client: SuiClient
) => {
  // mint 100 gray NFT
  const color = "gray";
  const weight = 11;

  // we create an array of length 100 with the same address
  // in production code this array will usually hold distinct addresses
  const addresses = Array(100).fill(address);
  for (let address of addresses) {
    const tx = new TransactionBlock();
    const nft = tx.moveCall({
      target: `${pkgId}::nft::mint`,
      arguments: [tx.pure(color, "string"), tx.pure(weight, "u32")],
    });
    tx.transferObjects([nft], tx.pure(address));
    await client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      requestType: "WaitForEffectsCert",
      signer,
    });
  }
};

// correct pattern: batch mints into the same PTB
const mass_mint_correct = async (
  address: string,
  keypair: Ed25519Keypair,
  client: SuiClient
) => {
  // mint 100 gray NFT
  const color = "gray";
  const weight = 11;
  // we create an array of length 100 with the same address
  // in production code this array will usually hold distinct addresses
  const addresses = Array(100).fill(address);

  // a transaction block can have up to 1024 commands
  // for larger mints we must break them into separate PTBs
  // in this case we only do 200, 100 mints and 100 transfers
  const tx = new TransactionBlock();

  // we can re-use the same inputs no need to create 200 of them in a loop
  // still there is not limit to pure inputs
  // object inputs have a max limit of 2048
  const colorInput = tx.pure(color, "string");
  const weightInput = tx.pure(weight, "u32");

  // mint and transfer for each address
  for (let address of addresses) {
    const nft = tx.moveCall({
      target: `${pkgId}::nft::mint`,
      arguments: [tx.pure(color, "string"), tx.pure(weight, "u32")],
    });
    tx.transferObjects([nft], tx.pure(address));
  }
  const response = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showBalanceChanges: true,
    },
    signer: keypair,
  });
  return response;
};

const mintSponsored = async (
  sender: string,
  sponsor: string,
  senderKeypair: Ed25519Keypair,
  sponsorKeypair: Ed25519Keypair,
  client: SuiClient
) => {
  const tx = new TransactionBlock();

  const nft = tx.moveCall({
    target: `${pkgId}::nft::mint`,
    arguments: [tx.pure("red", "string"), tx.pure(65, "u32")],
    typeArguments: [],
  });

  tx.transferObjects([nft], tx.pure(sender));

  tx.setSender(sender);
  tx.setGasOwner(sponsor);

  const txBytes = await tx.build({ client });
  const { signature: senderSignature, bytes: _b1 } =
    await senderKeypair.signTransactionBlock(txBytes);
  const { signature: sponsorSignature, bytes: _b2 } =
    await sponsorKeypair.signTransactionBlock(txBytes);

  const response = await client.executeTransactionBlock({
    transactionBlock: txBytes,
    signature: [senderSignature, sponsorSignature],
    options: {
      showEffects: true,
    },
    requestType: "WaitForLocalExecution",
  });

  return response;
};

const main = async () => {
  const { address, keypair, client } = getClient();
  let result;
  //call mint
  const color = "fuchsia";
  const weight = 28;
  // result = await mint(color, weight, address, keypair, client);

  //call mint_and_change
  // result = await mint_and_change(color, weight, address, keypair, client);

  // mint with payment
  // result = await mint_with_exact_payment(address, keypair, client);

  // call bad example
  // result = await bad_call(color, weight, address, keypair, client);

  // call mass mint
  // result = await mass_mint_correct(address, keypair, client);

  const {keypair: sponsorKeypair, address: sponsorAddress} = getSponsorData();
  result = await mintSponsored(address, sponsorAddress, keypair, sponsorKeypair, client);
  console.log(JSON.stringify(result));
};

main();
