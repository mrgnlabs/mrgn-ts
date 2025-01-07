import { Connection, PublicKey, ParsedAccountData, LAMPORTS_PER_SOL, StakeProgram } from "@solana/web3.js";
import { MarginfiClient, MarginfiConfig, getConfig } from "@mrgnlabs/marginfi-client-v2";
import { makeExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { BankMetadata, TokenMetadataRaw, shortenAddress } from "@mrgnlabs/mrgn-common";

const SINGLE_POOL_PROGRAM_ID = new PublicKey("SVSPxpvHdN29nkVg9rPapPNDddN5DipNLRUFhyjFThE");
const MAX_U64 = (2n ** 64n - 1n).toString();
const STAKED_BANK_METADATA_CACHE = "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json";
const STAKED_TOKEN_METADATA_CACHE = "https://storage.googleapis.com/mrgn-public/mrgn-staked-token-metadata-cache.json";

// represents a group of stake accounts associated with a validator
export type ValidatorStakeGroup = {
  validator: PublicKey;
  poolKey: PublicKey;
  poolMintKey: PublicKey;
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

    // Map accounts to promises and run them in parallel
    await Promise.all(
      accounts.map(async (acc) => {
        const parsedAccount = acc.account.data as ParsedAccountData;
        const stakeInfo = parsedAccount.parsed.info;

        // filter out inactive stake accounts
        if (
          !stakeInfo.stake?.delegation ||
          (opts.filterInactive &&
            (Number(stakeInfo.stake.delegation.activationEpoch) >= epochInfo.epoch ||
              stakeInfo.stake.delegation.deactivationEpoch !== MAX_U64))
        ) {
          return;
        }

        const validatorAddress = stakeInfo.stake.delegation.voter;
        const accountPubkey = acc.pubkey;
        const amount = Number(stakeInfo.stake.delegation.stake) / LAMPORTS_PER_SOL;

        const existingAccounts = validatorMap.get(validatorAddress) || [];
        validatorMap.set(validatorAddress, [...existingAccounts, { pubkey: accountPubkey, amount }]);
      })
    );

    // Calculate pool keys once per validator when creating return value
    return Promise.all(
      Array.from(validatorMap.entries()).map(async ([validatorAddress, accounts]) => {
        const poolKey = await findPoolAddress(new PublicKey(validatorAddress));
        const poolMintKey = await findPoolMintAddress(poolKey);
        return {
          validator: new PublicKey(validatorAddress),
          poolKey,
          poolMintKey,
          accounts,
        };
      })
    );
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
      const validator = validators.find((v) => v.poolMintKey.equals(bank.mint));
      if (!validator) {
        console.log(validators);
        console.error("validator not found for bank", bank.address.toBase58());
        return null;
      }

      const totalStaked = validator.accounts.reduce((acc, curr) => acc + curr.amount, 0);
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
            balance: totalStaked,
          },
        }
      );
    })
    .filter((b) => b !== null);

  return banks;
};

const findPoolAddress = (voteAccountAddress: PublicKey): PublicKey => {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), voteAccountAddress.toBuffer()],
    SINGLE_POOL_PROGRAM_ID
  );
  return pda;
};

const findPoolMintAddress = (poolAddress: PublicKey): PublicKey => {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("mint"), poolAddress.toBuffer()], SINGLE_POOL_PROGRAM_ID);
  return pda;
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
