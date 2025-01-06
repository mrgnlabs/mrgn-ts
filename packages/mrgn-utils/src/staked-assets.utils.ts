import { StakeProgram } from "@solana/web3.js";
import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js";

const MAX_U64 = (2n ** 64n - 1n).toString();

// represents a group of stake accounts associated with a validator
export type ValidatorStakeGroup = {
  validator: PublicKey;
  accounts: PublicKey[];
};

/**
 * Retrieves all active stake accounts associated with a given public key grouped by validator
 *
 * @warning this is an expensive rpc call and should be heavily cached
 *
 * @param connection - The Solana RPC connection to use for querying
 * @param publicKey - The public key to look up stake accounts for
 * @returns {Promise<ValidatorStakeGroup[]>} An array of validator stake groups
 */
const getStakeAccounts = async (connection: Connection, publicKey: PublicKey): Promise<ValidatorStakeGroup[]> => {
  const accounts = await connection.getParsedProgramAccounts(StakeProgram.programId, {
    filters: [
      {
        memcmp: {
          offset: 12,
          bytes: publicKey.toBase58(),
        },
      },
    ],
  });

  const validatorMap = new Map<string, PublicKey[]>();

  accounts.forEach((acc) => {
    const parsedAccount = acc.account.data as ParsedAccountData;
    const stakeInfo = parsedAccount.parsed.info;

    if (!stakeInfo.stake?.delegation || stakeInfo.stake.delegation.deactivationEpoch !== MAX_U64) {
      return;
    }

    const validatorAddress = stakeInfo.stake.delegation.voter;
    const accountPubkey = acc.pubkey;

    if (validatorMap.has(validatorAddress)) {
      validatorMap.get(validatorAddress)!.push(accountPubkey);
    } else {
      validatorMap.set(validatorAddress, [accountPubkey]);
    }
  });

  return Array.from(validatorMap.entries()).map(([validatorAddress, accounts]) => ({
    validator: new PublicKey(validatorAddress),
    accounts: accounts,
  }));
};

export { getStakeAccounts };
