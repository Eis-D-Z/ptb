import { TransactionBlock } from "@mysten/sui.js/transactions";
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

// building the transaction
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
  const pureAmounts = amounts.map((amount) => tx.pure.u64(amount));
  const newCoins = tx.splitCoins(tx.gas, pureAmounts);
  recipients.map((recipient, index) => {
    tx.transferObjects([newCoins[index]], tx.pure.address(recipient));
  });
  return await tx.build();
};

// getting the signature
const getSignature = async (
  txBytes: Uint8Array,
  keypair: Ed25519Keypair
) => {
  return (await keypair.signTransactionBlock(txBytes)).signature;
}

// executing any offline transaction
const execute = async (
  txBytes: Uint8Array,
  signature: string,
  client: SuiClient
) => {
  const result = await client.executeTransactionBlock({
    transactionBlock: txBytes,
    signature: [signature],
    options: { showBalanceChanges: true, showObjectChanges: true },
    requestType: "WaitForLocalExecution",
  });
  return result;
};

const main = async () => {
  const { address, keypair, client } = getClient();

  const coinId =
    "0x08270f9adc010e915b5f6ef5358594cf4bf63066209288898e7d856f83d50d37";
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
  // const signature = getSignature(txBytes, keypair, 0);

  const signature = await getSignature(txBytes, keypair);

  // // execution
  const result = await execute(txBytes, signature, client);
  console.log(result);
};

main();
