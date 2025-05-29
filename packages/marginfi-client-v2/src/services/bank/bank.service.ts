import { Keypair, PublicKey } from "@solana/web3.js";
import { InstructionsWrapper, SYSTEM_PROGRAM_ID } from "@mrgnlabs/mrgn-common";

import instructions from "../../instructions";
import { MarginfiProgram } from "../../types";
import { BankConfigOpt, BankConfigOptRaw, BankType, OracleSetup } from "./types";
import { serializeBankConfigOpt, serializeOracleSetupToIndex } from "./utils";
import {
  parseAccumulatorUpdateData,
  getGuardianSetIndex,
  trimSignatures,
  InstructionWithEphemeralSigners,
  buildPostEncodedVaaInstructions,
  PYTH_WORMHOLE_IDL,
  UPDATE_PRICE_FEED_COMPUTE_BUDGET,
  PYTH_PUSH_ORACLE_IDL,
  parsePriceFeedMessage,
  PYTH_SOLANA_RECEIVER_PROGRAM_IDL,
  DEFAULT_PUSH_ORACLE_PROGRAM_ID,
} from "../../vendor/pyth_crank";
import { Program, Provider } from "@coral-xyz/anchor";

export async function freezeBankConfigIx(
  program: MarginfiProgram,
  bankAddress: PublicKey,
  bankConfigOpt: BankConfigOpt
): Promise<InstructionsWrapper> {
  let bankConfigRaw: BankConfigOptRaw;
  if (!bankConfigOpt) {
    // todo: make bankConfigOpt optional and create function to get bankConfigOptRaw from bank
  }
  bankConfigRaw = serializeBankConfigOpt(bankConfigOpt);

  const ix = await instructions.makePoolConfigureBankIx(
    program,
    {
      bank: bankAddress,
    },
    {
      bankConfigOpt: {
        // ...bankConfigRaw,
        assetWeightInit: null,
        assetWeightMaint: null,

        liabilityWeightInit: null,
        liabilityWeightMaint: null,

        depositLimit: null,
        borrowLimit: null,
        riskTier: null,
        assetTag: null,
        totalAssetValueInitLimit: null,

        interestRateConfig: null,
        operationalState: null,

        oracleMaxAge: null,
        permissionlessBadDebtSettlement: null,
        freezeSettings: true,
      },
    }
  );

  return {
    instructions: [ix],
    keys: [],
  };
}

type AddOracleToBanksIxArgs = {
  program: MarginfiProgram;
  bankAddress: PublicKey;
  feedId: PublicKey;
  oracleKey?: PublicKey;
  setup: OracleSetup;
  groupAddress?: PublicKey;
  adminAddress?: PublicKey;
};

export async function addOracleToBanksIx({
  program,
  bankAddress,
  feedId,
  oracleKey,
  setup,
  groupAddress,
  adminAddress,
}: AddOracleToBanksIxArgs): Promise<InstructionsWrapper> {
  const ix = await instructions.makeLendingPoolConfigureBankOracleIx(
    program,
    {
      bank: bankAddress,
      group: groupAddress,
      admin: adminAddress,
    },
    {
      setup: serializeOracleSetupToIndex(setup),
      feedId,
    },
    oracleKey ? [{ isSigner: false, isWritable: false, pubkey: oracleKey }] : []
  );

  return {
    instructions: [ix],
    keys: [],
  };
}

/**
 * Derive the address of a price feed account
 * @param shardId The shard ID of the set of price feed accounts. This shard ID allows for multiple price feed accounts for the same price feed id to exist.
 * @param priceFeedId The price feed ID, as either a 32-byte buffer or hexadecimal string with or without a leading "0x" prefix.
 * @param pushOracleProgramId The program ID of the Pyth Push Oracle program. If not provided, the default deployment will be used.
 * @returns The address of the price feed account
 */
export function getPriceFeedAccountForProgram(
  shardId: number,
  priceFeedId: Buffer | string,
  pushOracleProgramId?: PublicKey
): PublicKey {
  if (typeof priceFeedId == "string") {
    if (priceFeedId.startsWith("0x")) {
      priceFeedId = Buffer.from(priceFeedId.slice(2), "hex");
    } else {
      priceFeedId = Buffer.from(priceFeedId, "hex");
    }
  }

  if (priceFeedId.length != 32) {
    throw new Error("Feed ID should be 32 bytes long");
  }
  const shardBuffer = Buffer.alloc(2);
  shardBuffer.writeUint16LE(shardId, 0);

  return PublicKey.findProgramAddressSync(
    [shardBuffer, priceFeedId],
    pushOracleProgramId ?? DEFAULT_PUSH_ORACLE_PROGRAM_ID
  )[0];
}

export const getTreasuryPda = (treasuryId: number, receiverProgramId: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("treasury"), Buffer.from([treasuryId])], receiverProgramId)[0];
};

export const getConfigPda = (receiverProgramId: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], receiverProgramId)[0];
};

export async function crankPythOracleIx(oracles: { feedId: string; shardId: number }[], provider: Provider) {
  const feedIdsByShardId: Record<number, string[]> = {};
  // const receiverProgram = new Program(PYTH_PUSH_ORACLE_PROGRAM_IDL, provider);
  const wormholeProgram = new Program(PYTH_WORMHOLE_IDL, provider);
  const pushOracleProgram = new Program(PYTH_PUSH_ORACLE_IDL, provider);
  const receiverProgram = new Program(PYTH_SOLANA_RECEIVER_PROGRAM_IDL, provider);

  const addressLookupTableAccount = new PublicKey("5DNCErWQFBdvCxWQXaC1mrEFsvL3ftrzZ2gVZWNybaSX");

  const buildURL = (endpoint: string) => {
    return new URL(`./v2/${endpoint}`, `https://hermes.pyth.network/`);
  };

  for (const oracle of oracles) {
    const { shardId, feedId } = oracle;
    if (!feedIdsByShardId[shardId]) {
      feedIdsByShardId[shardId] = [];
    }
    feedIdsByShardId[shardId].push(feedId);
  }
  const postInstructions: InstructionWithEphemeralSigners[] = [];
  const priceFeedIdToPriceUpdateAccount: Record<string, PublicKey> = {};
  const closeInstructions: InstructionWithEphemeralSigners[] = [];

  for (const [shardId, feedIds] of Object.entries(feedIdsByShardId)) {
    const url = buildURL("updates/price/latest");
    for (const id of feedIds) {
      url.searchParams.append("ids[]", id);
    }

    url.searchParams.append("encoding", "base64");

    const response = await fetch(url);
    const priceDataArray: string[] = (await response.json()).binary.data;

    const treasuryId = 0;

    for (const priceData of priceDataArray) {
      const accumulatorUpdateData = parseAccumulatorUpdateData(Buffer.from(priceData, "base64"));
      const guardianSetIndex = getGuardianSetIndex(accumulatorUpdateData.vaa);
      const trimmedVaa = trimSignatures(accumulatorUpdateData.vaa);

      const {
        postInstructions: postEncodedVaaInstructions,
        encodedVaaAddress: encodedVaa,
        closeInstructions: postEncodedVaacloseInstructions,
      } = await buildPostEncodedVaaInstructions(wormholeProgram, accumulatorUpdateData.vaa);
      postInstructions.push(...postEncodedVaaInstructions);
      closeInstructions.push(...postEncodedVaacloseInstructions);

      postInstructions.push(...postEncodedVaaInstructions);
      closeInstructions.push(...postEncodedVaacloseInstructions);

      for (const update of accumulatorUpdateData.updates) {
        const feedId = parsePriceFeedMessage(update.message).feedId;
        postInstructions.push({
          instruction: await pushOracleProgram.methods
            .updatePriceFeed(
              {
                merklePriceUpdate: update,
                treasuryId,
              },
              Number(shardId),
              Array.from(feedId)
            )
            .accounts({
              pythSolanaReceiver: receiverProgram.programId,
              encodedVaa,
              priceFeedAccount: getPriceFeedAccountForProgram(Number(shardId), feedId, pushOracleProgram.programId),
              treasury: getTreasuryPda(treasuryId, receiverProgram.programId),
              config: getConfigPda(receiverProgram.programId),
              systemProgram: SYSTEM_PROGRAM_ID,
            })
            .instruction(),
          signers: [],
          computeUnits: UPDATE_PRICE_FEED_COMPUTE_BUDGET,
        });
      }
    }
  }

  return {
    instructions: [...postInstructions, ...closeInstructions],
    keys: [],
  };
}
