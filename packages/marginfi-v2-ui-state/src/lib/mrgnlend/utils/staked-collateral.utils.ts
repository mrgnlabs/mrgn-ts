import { Connection, LAMPORTS_PER_SOL, ParsedAccountData, PublicKey, StakeProgram } from "@solana/web3.js";

import { MAX_U64 } from "@mrgnlabs/mrgn-common";
import { ValidatorStakeGroup, vendor } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "../types";
import {
  findPoolAddress,
  findPoolMintAddress,
  findPoolStakeAddress,
  findPoolOnRampAddress,
} from "@mrgnlabs/marginfi-client-v2/dist/vendor";

/**
 * Fetches stake accounts for a given public key from API
 * API in turn calls getStakeAccounts and caches the result
 *
 * @param publicKey - User's public key
 * @param opts - Options for filtering inactive stake accounts
 * @returns Promise<ValidatorStakeGroup[]> - Array of validator stake groups
 */
const getStakeAccountsCached = async (
  publicKey: PublicKey,
  opts: {
    filterInactive: boolean;
  } = {
    filterInactive: true,
  }
): Promise<ValidatorStakeGroup[]> => {
  const params = new URLSearchParams();
  params.set("address", publicKey.toBase58());
  params.set("filterInactive", opts.filterInactive.toString());

  const response = await fetch(`/api/user/stake-accounts?${params.toString()}`);

  if (!response.ok) {
    return [];
  }

  const stakeAccounts: ValidatorStakeGroup[] = await response.json();

  return stakeAccounts.map((stakeAccount) => ({
    ...stakeAccount,
    validator: new PublicKey(stakeAccount.validator),
    poolKey: new PublicKey(stakeAccount.poolKey),
    poolMintKey: new PublicKey(stakeAccount.poolMintKey),
    selectedAccount: {
      pubkey: new PublicKey(stakeAccount.selectedAccount.pubkey),
      amount: stakeAccount.selectedAccount.amount,
    },
    accounts: stakeAccount.accounts.map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      amount: account.amount,
    })),
  }));
};

export { getStakeAccountsCached };
