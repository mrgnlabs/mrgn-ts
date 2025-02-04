import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, EventParser, BorshCoder } from "@coral-xyz/anchor";

import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "./utils";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";

import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { getMint } from "@solana/spl-token";
import { base64, bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

type Config = {
  PROGRAM_ID: string;
  TX_SIG: string;
  EVENT_EXPECTED_SIZE: number;
};

const config: Config = {
  PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  TX_SIG: "45kWKVHmjudf5oaswAHDh6xrbR34sa5eVXnYC9fbPSjAdGCRd9DZbemkauFZ8obaTPmypjk5oKdapnNgbNUE6wtm",
  // The Liquidate event is 408 bytes, plus something (probably the Option) adds one byte.
  EVENT_EXPECTED_SIZE: 409,
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  const program: Program<Marginfi> = new Program(marginfiIdl as Marginfi, provider);

  const tx = await connection.getTransaction(config.TX_SIG, {
    maxSupportedTransactionVersion: 0,
  });
  const coder = new BorshCoder(program.idl);
  const parser = new EventParser(program.programId, coder);

  const logs = tx.meta?.logMessages || [];
  const decodedEvents = [];

  // const key = new PublicKey("2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB");
  // console.log("KEY ACTUAL:");
  // const keyBytes = key.toBuffer();
  // const keyHexStr = Array.from(keyBytes)
  //   .map((b) => b.toString(16).padStart(2, "0"))
  //   .join(" ");
  // console.log(" ", keyHexStr);
  // console.log("END KEY ACTUAL");

  for (const logLine of logs) {
    //console.log("line: " + logLine);
    let decoded = base64.decode(logLine.substring("Program data: ".length));
    // console.log("decoded bytes: " + decoded.length);
    if (decoded.length == config.EVENT_EXPECTED_SIZE) {
      console.log("decoded bytes (chunked hex):");
      const bytesPerLine = 16;
      for (let i = 0; i < decoded.length; i += bytesPerLine) {
        const chunk = decoded.subarray(i, i + bytesPerLine);
        const hexLine = Array.from(chunk)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        console.log(
          `[${i.toString().padStart(4, "0")}..${(i + chunk.length - 1).toString().padStart(4, "0")}]  ${hexLine}`
        );
      }

      // if you want, you can just read the raw bytes here into a float or whatever...
    }
    try {
      // pass one event at a time because parseLogs throws on decode errors...
      const events = parser.parseLogs([logLine], false);
      decodedEvents.push(...events);
    } catch (err) {
      // If a log line fails just print and ignore it, we likely just don't have the decoder...
      // console.warn(`Could not decode event from log:\n  ${logLine}\n`);
      // console.warn(`Error:`, err);
    }
  }

  console.log("Decoded events:");
  for (const event of parser.parseLogs(logs)) {
    console.log(event);
  }

  // Other usage ideas:
  // (1) const events = [...program.parseLogs(logs)];

  // (2) const parser = program.parseLogs(logs);
  // const firstEvent = parser.next().value;

  // (3) const eventsWithErrors = [...program.parseLogs(logs, true)];
}

main().catch((err) => {
  console.error(err);
});
