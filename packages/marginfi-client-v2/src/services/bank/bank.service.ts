import { PublicKey } from "@solana/web3.js";
import { InstructionsWrapper } from "@mrgnlabs/mrgn-common";

import { OracleSetup, oracleSetupToIndex, parseOracleSetup } from "../../models/bank";
import instructions from "../../instructions";
import { MarginfiProgram } from "../../types";

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
      setup: oracleSetupToIndex(setup),
      oracle,
    }
  );

  return {
    instructions: [ix],
    keys: [],
  };
}
