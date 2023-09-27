import { PublicKey, Connection, StakeProgram, AccountInfo, ParsedAccountData } from "@solana/web3.js";
import BN from "bn.js";

export interface StakeData {
  address: PublicKey;
  lamports: BN;
  isActive: boolean;
  validatorVoteAddress: PublicKey;
}

export async function fetchStakeAccounts(
  connection: Connection,
  walletAddress: PublicKey
): Promise<StakeData[]> {
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
      let isActive = parsedAccount.data.parsed.type === "delegated" && currentEpoch.epoch >= activationEpoch + 1 && deactivationEpoch > currentEpoch.epoch;
  
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
