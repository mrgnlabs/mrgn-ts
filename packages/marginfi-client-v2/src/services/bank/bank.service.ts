import { PublicKey } from "@solana/web3.js";
import { InstructionsWrapper } from "@mrgnlabs/mrgn-common";

import instructions from "../../instructions";
import { MarginfiProgram } from "../../types";
import { OracleSetup } from "./types";
import { serializeOracleSetupToIndex } from "./utils";

export async function addOracleToBanksIx(
  program: MarginfiProgram,
  bankAddress: PublicKey,
  oracle: PublicKey,
  setup: OracleSetup
): Promise<InstructionsWrapper> {
  const ix = await instructions.makeLendingPoolConfigureBankOracleIx(
    program,
    {
      bank: bankAddress,
    },
    {
      setup: serializeOracleSetupToIndex(setup),
      oracle,
    }
  );

  return {
    instructions: [ix],
    keys: [],
  };
}
