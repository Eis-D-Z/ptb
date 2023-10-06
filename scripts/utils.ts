import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/sui.js/utils";
import { SuiClient } from "@mysten/sui.js/client";
import { testnetConnection } from "@mysten/sui.js/dist/cjs/rpc/connection";
import * as dotenv from "dotenv";
dotenv.config();

const getClient = () => {
  const b64PrivateKey = process.env.PK_B64 as string;
  const privkey: number[] = Array.from(fromB64(b64PrivateKey));
  privkey.shift();
  const privateKey = Uint8Array.from(privkey);
  const keypair = Ed25519Keypair.fromSecretKey(privateKey);

  const address = `${keypair.getPublicKey().toSuiAddress()}`;
  const client = new SuiClient({
    url: "https://fullnode.testnet.sui.io:443",
  });

  return { address, keypair, client };
};

const getSponsorData = () => {
  const b64PrivateKey = process.env.SPONSOR_PK_B64 as string;
  const privkey: number[] = Array.from(fromB64(b64PrivateKey));
  privkey.shift();
  const privateKey = Uint8Array.from(privkey);
  const keypair = Ed25519Keypair.fromSecretKey(privateKey);

  const address = `${keypair.getPublicKey().toSuiAddress()}`;

  return { address, keypair };
};

export { getClient, getSponsorData };
