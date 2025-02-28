import bs58 from "bs58";
import { clusterApiUrl, Connection, Transaction, VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import { loadEnvFile } from "process";
import { DEFAULT_API_URL, loadKeypairFromFile } from "../scripts/utils";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi.json";
import { Marginfi } from "../../marginfi-client-v2/src/idl/marginfi-types";

type Config = {
  PROGRAM_ID: string;
  BS58TX: string;
};

const config: Config = {
  PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  BS58TX:
    "eBXpPPKqnq7RJhRk9p6depQ3GMvqetNCrtBqDASzyWrwnoTRjUQCAykgfBDrN3YYToSwog7Cx8Zd2QfjHy9EG2fz6mLACJe8Es9bhEAhCb3ztd1ZsQ5395zjNQKVwZWTTvMbnm22zDt11AeSrdCiH5jWq4sz1umGCRGBJWv541RPebLY4xovT4sx9zDRrf4HuKE9v7jQnA9CKFLdjFKQz6QdNxUzwDLy4UDTcqNofRMV6Y5kE8Pw33ECC4f73WvUN9JTSAdNFJeCjZFnwSAqMMmw2P2QaPM3xq8SfgE2VNWhF7EiV8MLHpXveEFHyEMMrby3HDraRTd8Cc5yeYv77HZ2KH8eHn7RJDKCgrp9beyd2AHGYunFBcExhE3i1BbDrEUhzSvvAaACsjBw1jcCb7NJmKPiod82jwGFZr5qTm1R41Xud9ZUpX4ps6rSYyTGNJxCsLLZvkWegFvDBuZgtGy1qoa5PF2J3uGfnmsG1rzE4tFnH4G58gFjd1L4QgMdvNh1XXckjQRMGVJMuN6BXcMMGmTZ11uLQpiYq4Z5ELYucr86FKe1ZZ1mnc3Gf3JagEQpYAQWAWpWv6qeuQ7YUSiVXkA8MHbF6ReB8phyjQLfKhEzuRr9AjC9SomjJ8gBDqvLJhFAT9v1DZpPYwNkK7hJyFerNpB3sdff8mVJXSWhQy8w8gMyvbAZmNQmMortDy5wpuwUatEiruokYXBFxFndusyaFkqEsrJm9gJjPHWoXAm2UXtw2jMBFydgRuMCymjBVujpfJR24kNuyhNRYHj7zQ6X6VAijbpCAQPSjRg2TvPKGaSQXWTNPdA8ZWxh6gTy2cuK87Qx8EFo39qSn8LeBRWShYqRU5A85p4VWR2YN53A1t2zAV15N9RGa6ZuntzC8ixyFmGsQ6K1Xs3aCsTCEvaHscTTobrGhWowAAsjFSJcJQ2z1LoM624KvQ5V1tJ1LSymTcaHGcgMmd21XcFVGvV9z2wCLnZGgZ9vnS2EuaZGiwSpo2qVkp9DZocQ6vujqXtCa4k5Ge2BbYfg7VDSpQHRGegPWgZYRk17ZcRWguYG2aRiW1hVSiDgyxYTmQwSpYDRJMNJnSm5BsnHYXBWTYBL8Zbh61n6nTJtbDiMdPXoVaHUcPyfsdREoRjgBa4uKHi7vPBK3wPopbWXHaYbZjeivzjAJ1iCz4txJRzKu2xm6LtQqsFvXXEj7wyKhucuDLxbp5zbbQC7R8h5E9MMm9JcZk8WnRqQoR252xceam5CrgXzSc1xotbYN",
};

async function main() {
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection(apiUrl, "confirmed");
  // const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  // const provider = new AnchorProvider(connection, wallet, {
  //   preflightCommitment: "confirmed",
  // });
  // const program: Program<Marginfi> = new Program(
  //   // @ts-ignore
  //   marginfiIdl as Marginfi,
  //   provider
  // );

  const buffer = bs58.decode(config.BS58TX);
  const base64Tx = buffer.toString("base64");

  console.log("===========================================");
  console.log("Base64 Encoded Transaction:");
  console.log(base64Tx);
  console.log("===========================================\n");

  let message = VersionedMessage.deserialize(buffer);

  const numRequiredSignatures = message.header.numRequiredSignatures;
  const keys = message.getAccountKeys().staticAccountKeys;
  const signers = keys.slice(0, numRequiredSignatures);
  // Print transaction signers
  console.log("Transaction Signers:");
  console.log("--------------------");
  signers.forEach((pubkey, index) => {
    console.log(`Signer ${index}: ${pubkey.toBase58()}`);
  });
  console.log("");

  console.log("Transaction Instructions:");
  console.log("---------------------------");
  message.compiledInstructions.forEach((instruction, ixIndex) => {
    console.log(`Instruction ${ixIndex}:`);
    const programId = keys[instruction.programIdIndex];
    console.log(`  Program ID: ${programId.toBase58()}`);
    // Convert the instruction's account indices to public keys
    console.log("  Accounts:");
    instruction.accountKeyIndexes.forEach((accountIndex, accIndex) => {
      console.log(` [${accIndex}]: ${keys[accountIndex].toBase58()}`);
    });
    // const dataBytes = Array.from(instruction.data).join(" ");
    const dataHex = Buffer.from(instruction.data).toString("hex");
    console.log(`  Data (hex): ${dataHex}`);
    // console.log(`  Data (raw): ${dataBytes}`);

    // TODO to interpret this data as args we have to manually parse the IDL. Gross.
    console.log("---------------------------");
  });

  console.log("\n===========================================");
  console.log("Simulating Transaction...");
  console.log("===========================================");

  // We have to pop out whatever blockhash we used when copying the base58 for the actual recent one
  const { blockhash } = await connection.getLatestBlockhash();
  message.recentBlockhash = blockhash;
  const txn = new VersionedTransaction(message);

  try {
    const simulationResult = await connection.simulateTransaction(txn);
    console.log("Transaction Simulation Status:");
    console.log("-----------------------");

    if (simulationResult.value.err) {
      console.log("Transaction Failed!");
      console.log("err: " + simulationResult.value.err.toString());
    } else {
      console.log("Transaction Succeeded!");
    }

    console.log("\nProgram Logs:");
    if (simulationResult.value.logs) {
      simulationResult.value.logs.forEach((log, index) => {
        console.log(`[${index}]: ${log}`);
      });
    } else {
      console.log("No logs available.");
    }
  } catch (err) {
    console.error("Error simulating transaction:", err);
  }
}

main().catch(console.error);
