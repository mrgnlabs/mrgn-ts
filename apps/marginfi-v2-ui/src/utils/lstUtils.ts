import { PublicKey, Connection, StakeProgram, AccountInfo, ParsedAccountData } from "@solana/web3.js";
import BN from "bn.js";

const DEFAULT_TICKS_PER_SECOND = 160;
const DEFAULT_TICKS_PER_SLOT = 64;
const SECONDS_PER_DAY = 24 * 60 * 60;
const TICKS_PER_DAY = DEFAULT_TICKS_PER_SECOND * SECONDS_PER_DAY;
const DEFAULT_SLOTS_PER_EPOCH = (2 * TICKS_PER_DAY) / DEFAULT_TICKS_PER_SLOT;
const DEFAULT_S_PER_SLOT = DEFAULT_TICKS_PER_SLOT / DEFAULT_TICKS_PER_SECOND;
const SECONDS_PER_EPOCH = DEFAULT_SLOTS_PER_EPOCH * DEFAULT_S_PER_SLOT;
export const EPOCHS_PER_YEAR = (SECONDS_PER_DAY * 365.25) / SECONDS_PER_EPOCH;

export interface StakeData {
  address: PublicKey;
  lamports: BN;
  isActive: boolean;
  validatorVoteAddress: PublicKey;
}

export async function fetchStakeAccounts(connection: Connection, walletAddress: PublicKey): Promise<StakeData[]> {
  const [parsedAccounts, currentEpoch] = await Promise.all([
    connection.getParsedProgramAccounts(StakeProgram.programId, {
      filters: [
        { dataSize: 200 },
        {
          memcmp: {
            offset: 12,
            bytes: walletAddress.toBase58(),
          },
        },
      ],
    }),
    connection.getEpochInfo(),
  ]);

  let newStakeAccountMetas = parsedAccounts
    .map(({ pubkey, account }) => {
      const parsedAccount = account as AccountInfo<ParsedAccountData>;

      const activationEpoch = Number(parsedAccount.data.parsed.info.stake.delegation.activationEpoch);
      const deactivationEpoch = Number(parsedAccount.data.parsed.info.stake.delegation.deactivationEpoch);
      let isActive =
        parsedAccount.data.parsed.type === "delegated" &&
        currentEpoch.epoch >= activationEpoch + 1 &&
        deactivationEpoch > currentEpoch.epoch;

      return {
        address: pubkey,
        lamports: new BN(account.lamports),
        isActive,
        validatorVoteAddress: new PublicKey(parsedAccount.data.parsed.info.stake.delegation.voter),
      } as StakeData;
    })
    .filter((stakeAccountMeta) => stakeAccountMeta !== undefined);

  return newStakeAccountMetas;
}
