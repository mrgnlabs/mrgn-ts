import { getMarginfiClient } from "./utils";
import { getConfig } from "../src";
import { env_config } from "./config";
import {
  AddressLookupTableProgram,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { NodeWallet, TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { Storage } from "@google-cloud/storage";
import path from "path";
import fs from "fs";

const TRADE_GROUPS_MAP = "https://storage.googleapis.com/mrgn-public/mfi-trade-groups-stage.json?invalidatecache=0958";
const TOKEN_METADATA_MAP =
  "https://storage.googleapis.com/mrgn-public/mfi-trade-token-metadata-cache.json?invalidatecache=0958";
const BANK_METADATA_MAP =
  "https://storage.googleapis.com/mrgn-public/mfi-trade-bank-metadata-cache.json?invalidatecache=0958";
const POOLS_PER_PAGE = 12;
const LUT_CACHE = "https://storage.googleapis.com/mrgn-public/mrgn-lut-cache.json";
const BUCKET_NAME = process.env.GCP_BUCKET_NAME || "mrgn-public";
const FILE_NAME = "mrgn-lut-cache.json";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

type LutCache = {
  [group: string]: string;
};

type TradeGroupsCache = {
  [group: string]: [string, string];
};

async function main() {
  const config = getConfig(env_config.MRGN_ENV);
  const tradeGroups: TradeGroupsCache = await fetch(TRADE_GROUPS_MAP).then((res) => res.json());
  const lutCache: LutCache = await fetch(LUT_CACHE).then((res) => res.json());
  const wallet = env_config.LUT_AUTHORITY_KEYPAIR ? new NodeWallet(env_config.LUT_AUTHORITY_KEYPAIR) : null;

  if (!tradeGroups) {
    console.error("Failed to fetch trade groups");
    return;
  }

  if (!lutCache) {
    console.error("Failed to fetch trade groups");
    return;
  }

  if (!wallet) {
    console.error("Lut authority keypair missing");
    return;
  }

  const groups = Object.keys(tradeGroups).map((group) => new PublicKey(group));

  for (const group in groups) {
    console.log(`Processing group ${group}`);
    const groupKey = new PublicKey(groups[group]);
    const client = await getMarginfiClient({
      //   authority: wallet.publicKey,
      configOverride: {
        ...config,
        groupPk: groupKey,
      },
    });

    console.log({});

    const banks = tradeGroups[groupKey.toBase58()]
      .map((bank) => client.getBankByPk(new PublicKey(bank)))
      .filter((bank) => bank !== null);
    console.log(`fetched ${banks.length} banks for ${group}`);

    const oracleKeys = banks.flatMap((bank) => bank.config.oracleKeys);
    const bankKeys = banks.map((bank) => bank.address);
    const liqKeys = bankKeys.flatMap((bankPubkey) => {
      const liquidityVaultSeed = [Buffer.from("liquidity_vault"), bankPubkey.toBuffer()];
      const liquidityVaultAuthoritySeed = [Buffer.from("liquidity_vault_auth"), bankPubkey.toBuffer()];

      const [liquidityVault] = PublicKey.findProgramAddressSync(liquidityVaultSeed, client.program.programId);
      const [liquidityVaultAuthority] = PublicKey.findProgramAddressSync(
        liquidityVaultAuthoritySeed,
        client.program.programId
      );

      return [...[liquidityVault, liquidityVaultAuthority]];
    });
    const programKeys = [SystemProgram.programId, client.programId, TOKEN_PROGRAM_ID];

    const totalKeys = [...oracleKeys, groupKey, ...bankKeys, ...liqKeys, ...programKeys];

    const lutKey = new PublicKey(lutCache[groupKey.toBase58()]);
    const lut = await client.provider.connection.getAddressLookupTable(lutKey);
    const isLutValid = checkLutKeys(lut.value?.state.addresses, totalKeys);

    console.log(`LUT for group ${group} is ${isLutValid ? "valid" : "invalid"}`);

    if (!isLutValid) {
      const lutAuthority = lut.value?.state.authority;
      const slot = await client.provider.connection.getSlot();
      let instructions: TransactionInstruction[] = [];

      if (lutAuthority?.toBase58() === wallet.publicKey.toBase58()) {
        const closeInstruction = AddressLookupTableProgram.closeLookupTable({
          recipient: wallet.publicKey,
          authority: wallet.publicKey,
          lookupTable: lutKey,
        });
        instructions.push(closeInstruction);
      }

      const [createInstruction, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        recentSlot: slot,
      });
      instructions.push(createInstruction);

      const extendInstruction = AddressLookupTableProgram.extendLookupTable({
        payer: wallet.publicKey,
        authority: wallet.publicKey,
        lookupTable: lookupTableAddress,
        addresses: totalKeys,
      });
      instructions.push(extendInstruction);

      try {
        const tx = new Transaction();
        tx.add(...instructions);
        tx.feePayer = wallet.publicKey;
        const { blockhash, lastValidBlockHeight } = await client.provider.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        const signedTx = await wallet.signTransaction(tx);
        const signature = await client.provider.connection.sendRawTransaction(signedTx.serialize());
        console.log(`Signature for group ${group}: ${signature}`);
        const confirmation = await client.provider.connection.confirmTransaction(
          {
            blockhash,
            lastValidBlockHeight,
            signature,
          },
          "confirmed"
        );
        if (confirmation.value.err) {
          throw new Error("");
        } else {
          console.log(`LUT for group ${group} updated`);
          lutCache[groupKey.toBase58()] = lookupTableAddress.toBase58();
        }
      } catch {
        console.error("transaction failed to land, try again");
      }
    } else {
      console.log(`LUT for group ${group} is already valid`);
    }
  }

  console.log({ lutCache });

  const bucket = storage.bucket(BUCKET_NAME);
  // Upload the updated JSON file back to GCP
  const tempFilePath = path.join(process.cwd(), FILE_NAME);
  fs.writeFileSync(tempFilePath, JSON.stringify(lutCache, null, 2));
  await bucket.upload(tempFilePath, {
    destination: FILE_NAME,
    metadata: {
      contentType: "application/json",
    },
  });

  // Clean up the temporary file
  fs.unlinkSync(tempFilePath);
}

function checkLutKeys(lut: PublicKey[] | undefined, totalKeys: PublicKey[]) {
  if (!lut) return false;

  const lutKeys = new Set(lut.map((key) => key.toBase58()));
  const totalKeysSet = new Set(totalKeys.map((key) => key.toBase58()));

  if (lutKeys.size !== totalKeysSet.size) {
    return false;
  }

  for (const key of totalKeysSet) {
    if (!lutKeys.has(key)) {
      return false;
    }
  }

  return true;
}

main().catch((e) => console.log(e));
