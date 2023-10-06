import { TransactionBlock } from "@mysten/sui.js/transactions";
import { getClient } from "./utils";

const mint = async () => {
  const { address, keypair, client } = getClient();
  const tx = new TransactionBlock();

  let color = tx.pure("Blue", "string");
  let weight = tx.pure("50", "u32");
  const nft = tx.moveCall({
    target: `0x49db289194209b59eb7b5940db6916f26f790c57d16f870c384b7faf1fb28783::nft::mint`,
    arguments: [color, weight],
    typeArguments: [],
  });

  tx.transferObjects([nft], tx.pure(address));

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
    },
    signer: keypair,
  });

  console.log(result);
};

mint();
