import { TransactionBlock } from "@mysten/sui.js/transactions";
import { toB64, fromB64 } from "@mysten/sui.js/utils";
import { blake2b } from "@noble/hashes/blake2b";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { getClient } from "./utils";
import * as dotenv from "dotenv";
import { SuiClient } from "@mysten/sui.js/dist/cjs/client";


dotenv.config();

// type definition

interface ObjectRef {
  objectId: string;
  version: string;
  digest: string;
}

const getCoinRef = async (client: SuiClient, coinId: string) => {
  const response = await client.getObject({
    id: coinId,
    options: {},
  });
  let reference: ObjectRef = {
    objectId: "",
    version: "",
    digest: "",
  };
  if (response.data != null) {
    reference = response.data;
  }
  return reference;
};

const getTxBytes = async (
  coinRefs: ObjectRef[],
  amounts: string[],
  recipients: string[],
  sender: string
) => {
  const tx = new TransactionBlock();
  tx.setGasPayment(coinRefs);
  tx.setGasBudget(100000000);
  tx.setGasOwner(sender);
  tx.setGasPrice(1000);
  tx.setSender(sender);
  const pureAmounts = amounts.map((amount) => tx.pure(amount));
  const newCoins = tx.splitCoins(tx.gas, pureAmounts);
  recipients.map((recipient, index) => {
    tx.transferObjects([newCoins[index]], tx.pure(recipient));
  });
  return await tx.build();
};

const getSignature = (
  txBytes: Uint8Array,
  keypair: Ed25519Keypair,
  schemeByte: number
) => {
  const dataToSign = new Uint8Array(3 + txBytes.length);
  dataToSign.set([0, 0, 0]);
  dataToSign.set(txBytes, 3);
  const digest = blake2b(dataToSign, { dkLen: 32 });
  const rawSignature = keypair.signData(digest);
  const pubKey = keypair.getPublicKey().toRawBytes();
  const signature = new Uint8Array(1 + rawSignature.length + pubKey.length);
  signature.set([schemeByte]);
  signature.set(rawSignature, 1);
  signature.set(pubKey, 1 + rawSignature.length);
  return signature;
};

const execute = async (
  txBytes: Uint8Array,
  signature: Uint8Array,
  client: SuiClient
) => {
  const result = await client.executeTransactionBlock({
    transactionBlock: txBytes,
    signature: toB64(signature),
    options: { showBalanceChanges: true, showObjectChanges: true },
    requestType: "WaitForLocalExecution",
  });
  return result;
};

const main = async () => {
  const { address, keypair, client } = getClient();

  const coinId =
    "0x14193981efb3a98d5ce2e8e6a9591becdf6a25b66c68fe59bf28bd142aa0daab";
  // this can be gotten with provider.getObject for each coin above, or through transaction responses
  const coinRef = await getCoinRef(client, coinId);

  // the amounts we want to send
  const amounts = ["10000001", "25008988"];

  // the recipient of each amount
  const recipients = [
    "0x318456e35f0099ac0487ca222cb701ad1053e049ff4a2e4a472bcb696685bf54",
    "0x318456e35f0099ac0487ca222cb701ad1053e049ff4a2e4a472bcb696685bf54",
  ];
  const txBytes = await getTxBytes(
    [coinRef as ObjectRef],
    amounts,
    recipients,
    address
  );
  const signature = getSignature(txBytes, keypair, 0);

  // execution
  const result = await execute(txBytes, signature, client);
  console.log(result);
};

main();
