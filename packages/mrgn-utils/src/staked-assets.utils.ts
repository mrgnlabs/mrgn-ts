import { Connection, PublicKey, ParsedAccountData, LAMPORTS_PER_SOL, StakeProgram } from "@solana/web3.js";
import { minidenticon } from "minidenticons";

import {
  MarginfiAccountWrapper,
  MarginfiClient,
  MarginfiConfig,
  OracleSetup,
  getConfig,
  parsePriceInfo,
} from "@mrgnlabs/marginfi-client-v2";
import { makeExtendedBankInfo, fetchTokenAccounts } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  BankMetadata,
  chunkedGetRawMultipleAccountInfoOrdered,
  shortenAddress,
  TOKEN_PROGRAM_ID,
  TokenMetadata,
  TokenMetadataRaw,
  WSOL_MINT,
} from "@mrgnlabs/mrgn-common";

const MAX_U64 = (2n ** 64n - 1n).toString();
const STAKED_BANK_METADATA_CACHE = "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json";
const STAKED_TOKEN_METADATA_CACHE = "https://storage.googleapis.com/mrgn-public/mrgn-staked-token-metadata-cache.json";

// represents a group of stake accounts associated with a validator
export type ValidatorStakeGroup = {
  validator: PublicKey;
  accounts: {
    pubkey: PublicKey;
    amount: number;
  }[];
};

/**
 * Retrieves all active stake accounts associated with a given public key grouped by validator
 *
 * @warning this is an expensive rpc call and should be heavily cached
 *
 * @param connection - The Solana RPC connection to use for querying
 * @param publicKey - The public key to look up stake accounts for
 * @param opts - Options for filtering inactive stake accounts
 * @returns {Promise<ValidatorStakeGroup[]>} An array of validator stake groups
 */
const getStakeAccounts = async (
  connection: Connection,
  publicKey: PublicKey,
  opts: {
    filterInactive: boolean;
  } = {
    filterInactive: true,
  }
): Promise<ValidatorStakeGroup[]> => {
  if (!connection || !publicKey) {
    throw new Error("Invalid connection or public key");
  }

  try {
    const epochInfo = await connection.getEpochInfo();
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

    const validatorMap = new Map<string, { pubkey: PublicKey; amount: number }[]>();

    accounts.forEach((acc) => {
      const parsedAccount = acc.account.data as ParsedAccountData;
      const stakeInfo = parsedAccount.parsed.info;

      // filter out inactive stake accounts
      // (unless opts.filterInactive is true)
      if (
        !stakeInfo.stake?.delegation ||
        (opts.filterInactive &&
          (Number(stakeInfo.stake.delegation.activationEpoch) >= epochInfo.epoch || // activating
            stakeInfo.stake.delegation.deactivationEpoch !== MAX_U64)) // deactivating
      ) {
        return;
      }

      const validatorAddress = stakeInfo.stake.delegation.voter;
      const accountPubkey = acc.pubkey;
      const amount = Number(stakeInfo.stake.delegation.stake) / LAMPORTS_PER_SOL;

      const existingAccounts = validatorMap.get(validatorAddress) || [];
      validatorMap.set(validatorAddress, [...existingAccounts, { pubkey: accountPubkey, amount }]);
    });

    return Array.from(validatorMap.entries()).map(([validatorAddress, accounts]) => ({
      validator: new PublicKey(validatorAddress),
      accounts: accounts,
    }));
  } catch (e) {
    console.error("Error getting stake accounts", e);
    return [];
  }
};

/**
 * Retrieves all staked asset banks available for a given set of validators
 * TODO: derive spl pool / lst mint and use this to filter stakedAssetBanks
 *
 * @param connection - The Solana RPC connection to use for querying
 * @param validators - The validators to look up staked asset banks for
 * @returns {Promise<Bank[]>} An array of staked asset banks
 */
const getAvailableStakedAssetBanks = async (
  connection: Connection,
  validators: ValidatorStakeGroup[],
  configOverride?: Partial<MarginfiConfig>
) => {
  const client = await MarginfiClient.fetch({ ...getConfig(), ...configOverride }, {} as any, connection);
  const allBanks = Array.from(client.banks.values());
  const stakedAssetBanks = allBanks.filter((bank) => bank.config.assetTag === 2);
  const tokenMetadata = await getStakedTokenMetadata();
  const oraclePrice = client.getOraclePriceByBank(stakedAssetBanks[0].address);

  if (!oraclePrice) {
    console.error("Staked asset oracle price data not found");
    return [];
  }

  const banks = stakedAssetBanks
    .map((bank) => {
      // TODO: replace this by derriving the validator single spl pool key
      // and filter on bank.splPool
      // const validator = validators.find((v) => v.validator.equals(bank.address));
      // if (!validator) {
      //   console.log(validators);
      //   console.error("validator not found for bank", bank.address.toBase58());
      //   return null;
      // }

      // const totalStaked = validator.accounts.reduce((acc, curr) => acc + curr.amount, 0);

      const tMeta = tokenMetadata.find((t) => t.address === bank.mint.toBase58());

      return makeExtendedBankInfo(
        {
          name: tMeta?.name || `Staked ${shortenAddress(bank.mint)}`,
          symbol: tMeta?.symbol || bank.mint.toBase58().slice(0, 4),
        },
        bank,
        oraclePrice,
        undefined,
        {
          nativeSolBalance: 0,
          marginfiAccount: null,
          tokenAccount: {
            mint: bank.mint,
            created: true,
            balance: 1.567,
          },
        }
      );
    })
    .filter((b) => b !== null);

  return banks;
};

const getStakedBankMetadata = async (): Promise<BankMetadata[]> => {
  const bankMetadata = await fetch(STAKED_BANK_METADATA_CACHE).then((res) => res.json());
  return bankMetadata;
};

const getStakedTokenMetadata = async (): Promise<TokenMetadataRaw[]> => {
  const tokenMetadata = await fetch(STAKED_TOKEN_METADATA_CACHE).then((res) => res.json());
  return tokenMetadata;
};

export { getStakeAccounts, getAvailableStakedAssetBanks, getStakedBankMetadata, getStakedTokenMetadata };
