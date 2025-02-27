import bs58 from "bs58";
import { Transaction, VersionedMessage } from "@solana/web3.js";

const b58EncodedTx =
  "eBXpPPKqnq7RJhRk9p6depQ3GMvqetNCrtBqDASzyWrwnoTRjUQCAykgfBDrN3YYToSwog7Cx8Zd2QfjHy9EG2fz6mLACJe8Es9bhEAhCb3ztd1ZsQ5395zjNQKVwZWTTvMbnm22zDt11AeSrdCiH5jWq4sz1umGCRGBJWv541RPebLY4xovT4sx9zDRrf4HuKE9v7jQnA9CKFLdjFKQz6QdNxUzwDLy4UDTcqNofRMV6Y5kE8Pw33ECC4f73WvUN9JTSAdNFJeCjZFnwSAqMMmw2P2QaPM3xq8SfgE2VNWhF7EiV8MLHpXveEFHyEMMrby3HDraRTd8Cc5yeYv77HZ2KH8eHn7RJDKCgrp9beyd2AHGYunFBcExhE3i1BbDrEUhzSvvAaACsjBw1jcCb7NJmKPiod82jwGFZr5qTm1R41Xud9ZUpX4ps6rSYyTGNJxCsLLZvkWegFvDBuZgtGy1qoa5PF2J3uGfnmsG1rzE4tFnH4G58gFjd1L4QgMdvNh1XXckjQRMGVJMuN6BXcMMGmTZ11uLQpiYq4Z5ELYucr86FKe1ZZ1mnc3Gf3JagEQpYAQWAWpWv6qeuQ7YUSiVXkA8MHbF6ReB8phyjQLfKhEzuRr9AjC9SomjJ8gBDqvLJhFAT9v1DZpPYwNkK7hJyFerNpB3sdff8mVJXSWhQy8w8gMyvbAZmNQmMortDy5wpuwUatEiruokYXBFxFndusyaFkqEsrJm9gJjPHWoXAm2UXtw2jMBFydgRuMCymjBVujpfJR24kNuyhNRYHj7zQ6X6VAijbpCAQPSjRg2TvPKGaSQXWTNPdA8ZWxh6gTy2cuK87Qx8EFo39qSn8LeBRWShYqRU5A85p4VWR2YN53A1t2zAV15N9RGa6ZuntzC8ixyFmGsQ6K1Xs3aCsTCEvaHscTTobrGhWowAAsjFSJcJQ2z1LoM624KvQ5V1tJ1LSymTcaHGcgMmd21XcFVGvV9z2wCLnZGgZ9vnS2EuaZGiwSpo2qVkp9DZocQ6vujqXtCa4k5Ge2BbYfg7VDSpQHRGegPWgZYRk17ZcRWguYG2aRiW1hVSiDgyxYTmQwSpYDRJMNJnSm5BsnHYXBWTYBL8Zbh61n6nTJtbDiMdPXoVaHUcPyfsdREoRjgBa4uKHi7vPBK3wPopbWXHaYbZjeivzjAJ1iCz4txJRzKu2xm6LtQqsFvXXEj7wyKhucuDLxbp5zbbQC7R8h5E9MMm9JcZk8WnRqQoR252xceam5CrgXzSc1xotbYN";

const buffer = bs58.decode(b58EncodedTx);
const base64Tx = buffer.toString("base64");

console.log("===========================================");
console.log("Base64 Encoded Transaction:");
console.log(base64Tx);
console.log("===========================================\n");

const message = VersionedMessage.deserialize(buffer);

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
  // Retrieve the program ID using the programIdIndex from the message's account keys
  const programId = keys[instruction.programIdIndex];
  console.log(`  Program ID: ${programId.toBase58()}`);
  // Convert the instruction's account indices to public keys
  console.log("  Accounts:");
  instruction.accountKeyIndexes.forEach((accountIndex, accIndex) => {
    console.log(`    ${accIndex}: ${keys[accountIndex].toBase58()}`);
  });
  // 'data' is the raw instruction data (typically encoded as a hex string)
  const dataBytes = Array.from(instruction.data).join(" ");
  const dataHex = Buffer.from(instruction.data).toString("hex");
  console.log(`  Data (hex): ${dataHex}`);
  console.log(`  Data (raw): ${dataBytes}`);
  console.log("---------------------------");
});
