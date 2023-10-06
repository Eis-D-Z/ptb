import { SuiClient } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/sui.js/utils";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { get } from "http";
import * as dotenv from "dotenv";
dotenv.config();


const client = new SuiClient({
  url: "https://fullnode.testnet.sui.io:443",
});

const getKeypair = () => {
    const b64PrivateKey = process.env.PK_B64 as string;
  const privkey: number[] = Array.from(fromB64(b64PrivateKey));
  privkey.shift();
  const privateKey = Uint8Array.from(privkey);
  const keypair = Ed25519Keypair.fromSecretKey(privateKey);

//   const address = `${keypair.getPublicKey().toSuiAddress()}`;
  return keypair;
}

const getObj = async (id: string) => {
  const response = await client.getObject({
    id,
    options: {
      showContent: true,
      showOwner: true,
      showDisplay: true,
    },
  });
  console.log(JSON.stringify(response));
};

// getObj("0x0024385db4635dba023aa5a6f4842c25145cbdb467ab8aa30a654e3facff8631");

const mintNFT = async () => {

    const keypair  = getKeypair();
    const tx = new TransactionBlock();

    // tx.setSender("0x6f2d5e80dd21cb2c87c80b227d662642c688090dc81adbd9c4ae1fe889dfaf71");
    

    const color = tx.pure("pink", "string");
    const weight = tx.pure("50", "u32");
    const nft = tx.moveCall({
        target: "0x95ab69d4746b3cd6743404447c3a60298bf481301c0cde7514555af39161a295::nft::mint",
        typeArguments: [],
        arguments: [color, weight]
    });

    tx.moveCall({
        target: "0x95ab69d4746b3cd6743404447c3a60298bf481301c0cde7514555af39161a295::nft::change_color",
        arguments: [nft, tx.pure("violet")]
    })
    tx.transferObjects([nft], tx.pure("0x6f2d5e80dd21cb2c87c80b227d662642c688090dc81adbd9c4ae1fe889dfaf71"));

    // const txBytes = await tx.build({client});

    // const {signature, bytes} = await keypair.signTransactionBlock(txBytes);

    // const respose = await client.executeTransactionBlock({
    //     transactionBlock: txBytes,
    //     options: {
    //         showEffects: true
    //     },
    //     requestType: "WaitForLocalExecution",
    //     signature,
    // });

    const response = await client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
            showEffects: true
        },
        requestType: "WaitForLocalExecution",
        signer: keypair
    })

    console.log(response);

}

mintNFT()



