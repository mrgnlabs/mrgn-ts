import { Keypair, PublicKey } from "@solana/web3.js";
import { InstructionsWrapper } from "@mrgnlabs/mrgn-common";

import instructions from "../../instructions";
import { MarginfiProgram } from "../../types";
import { BankConfigOpt, BankConfigOptRaw, BankType, OracleSetup } from "./types";
import { serializeBankConfigOpt, serializeOracleSetupToIndex } from "./utils";
import {
  parseAccumulatorUpdateData,
  getGuardianSetIndex,
  trimSignatures,
  PYTH_PUSH_ORACLE_PROGRAM_IDL,
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

export async function crankPythOracleIx(oracles: { feedId: string; shardId: number }[], provider: Provider) {
  const feedIdsByShardId: Record<number, string[]> = {};
  const receiverProgram = new Program(PYTH_PUSH_ORACLE_PROGRAM_IDL, provider);

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

  for (const [shardId, feedIds] of Object.entries(feedIdsByShardId)) {
    const url = buildURL("updates/price/latest");
    for (const id of feedIds) {
      url.searchParams.append("ids[]", id);
    }

    url.searchParams.append("encoding", "base64");

    const response = await fetch(url);
    const priceDataArray: string[] = (await response.json()).binary.data;

    // const postInstructions: InstructionWithEphemeralSigners[] = [];
    // const priceFeedIdToPriceUpdateAccount: Record<string, PublicKey> = {};
    // const closeInstructions: InstructionWithEphemeralSigners[] = [];

    const treasuryId = 0;

    for (const priceData of priceDataArray) {
      const accumulatorUpdateData = parseAccumulatorUpdateData(Buffer.from(priceData, "base64"));
      const guardianSetIndex = getGuardianSetIndex(accumulatorUpdateData.vaa);
      const trimmedVaa = trimSignatures(accumulatorUpdateData.vaa);

      for (const update of accumulatorUpdateData.updates) {
        const priceUpdateKeypair = new Keypair();
        // postInstructions.push({
        //   instruction: await this.receiver.methods
        //     .postUpdateAtomic({
        //       vaa: trimmedVaa,
        //       merklePriceUpdate: update,
        //       treasuryId,
        //     })
        //     .accounts({
        //       priceUpdateAccount: priceUpdateKeypair.publicKey,
        //       treasury: getTreasuryPda(treasuryId, this.receiver.programId),
        //       config: getConfigPda(this.receiver.programId),
        //       guardianSet: getGuardianSetPda(
        //         guardianSetIndex,
        //         this.wormhole.programId,
        //       ),
        //     })
        //     .instruction(),
        //   signers: [priceUpdateKeypair],
        //   computeUnits: POST_UPDATE_ATOMIC_COMPUTE_BUDGET,
        // });
        // priceFeedIdToPriceUpdateAccount[
        //   "0x" + parsePriceFeedMessage(update.message).feedId.toString("hex")
        // ] = priceUpdateKeypair.publicKey;

        // closeInstructions.push(
        //   await this.buildClosePriceUpdateInstruction(
        //     priceUpdateKeypair.publicKey,
        //   ),
        // );
      }
    }
  }
}
