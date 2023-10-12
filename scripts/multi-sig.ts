import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { MultiSigPublicKey } from "@mysten/sui.js/multisig";
import { fromB64, toB64 } from "@mysten/sui.js/utils";
import * as fs from "fs";
import { join } from "path";
import * as dv from "dotenv";
import { getClient } from "./utils";
dv.config();

/* Step 1 

Create a multi-sig address
This example will have a 1 of 2

*/

// helper to get keypairs

const getKeypair = (b64PrivateKey: string) => {
  const privkey: number[] = Array.from(fromB64(b64PrivateKey));
  privkey.shift();
  const privateKey = Uint8Array.from(privkey);
  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  return keypair;
};

const createMultiSig = () => {
  // get 2 keypairs
  const kp1 = getKeypair(process.env.PK_B64!);
  const kp2 = getKeypair(process.env.PK_2_B64!);

  const msPubKey = MultiSigPublicKey.fromPublicKeys({
    threshold: 1,
    publicKeys: [
      {
        publicKey: kp1.getPublicKey(),
        weight: 1,
      },
      {
        publicKey: kp2.getPublicKey(),
        weight: 1,
      },
    ],
  });
  const address = msPubKey.toSuiAddress();

  return { kp1, kp2, publicKey: msPubKey, address };
};

/*
 Step 2: Publish from a multi-sig account
*/

const publishContract = async () => {
  const { address, keypair, client } = getClient();
  const {kp1, kp2, publicKey, address: msAddress} = createMultiSig();
  console.log(msAddress);
  let fread = fs.readFileSync(
    "../contracts/build/contracts/bytecode_modules/capExample.mv",
    null
  );
  const mod1 = Array.from(fread);
  fread = fs.readFileSync(
    "../contracts/build/contracts/bytecode_modules/locker.mv",
    null
  );
  const mod2 = Array.from(fread);
  fread = fs.readFileSync(
    "../contracts/build/contracts/bytecode_modules/nft.mv",
    null
  );
  const mod3 = Array.from(fread);
  const tx = new TransactionBlock();

  tx.setSender(msAddress);
  const upgCap = tx.publish({
    modules: [mod1, mod2, mod3],
    dependencies: ["0x1", "0x2"],
  });

  tx.transferObjects([upgCap], tx.pure(address));

  const txb = await tx.build({client});

  const sig1 = (await kp1.signTransactionBlock(txb)).signature;

  const combinedSig = publicKey.combinePartialSignatures([sig1]);

  const res = await client.executeTransactionBlock({
    transactionBlock: txb,
    signature: [combinedSig],
    options: { showEffects: true },
    requestType: "WaitForLocalExecution",
  });

  console.log(res);
};
publishContract();
