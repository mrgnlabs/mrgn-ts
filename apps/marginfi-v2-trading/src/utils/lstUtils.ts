import {
  PublicKey,
  Connection,
  StakeProgram,
  AccountInfo,
  ParsedAccountData,
  TransactionInstruction,
  Signer,
  StakeAuthorizationLayout,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";
import BN from "bn.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/mrgn-common";

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

/**
 * Creates instructions required to deposit sol to stake pool.
 */
export async function makeDepositSolToStakePoolIx(
  stakePool: solanaStakePool.StakePool,
  stakePoolAddress: PublicKey,
  from: PublicKey,
  lamports: BN,
  destinationTokenAccount?: PublicKey,
  referrerTokenAccount?: PublicKey,
  depositAuthority?: PublicKey,
  priorityFee?: number
) {
  // Ephemeral SOL account just to do the transfer
  const userSolTransfer = new Keypair();
  const signers: Signer[] = [userSolTransfer];
  const instructions: TransactionInstruction[] = [];

  // Priority fees
  instructions.push(...makePriorityFeeIx(priorityFee));

  // Create the ephemeral SOL account
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: userSolTransfer.publicKey,
      lamports: lamports.toNumber(),
    })
  );

  // Create token account if not specified
  if (!destinationTokenAccount) {
    const associatedAddress = getAssociatedTokenAddressSync(stakePool.poolMint, from, true);
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(from, associatedAddress, from, stakePool.poolMint)
    );
    destinationTokenAccount = associatedAddress;
  }

  const withdrawAuthority = findWithdrawAuthorityProgramAddress(
    solanaStakePool.STAKE_POOL_PROGRAM_ID,
    stakePoolAddress
  );

  instructions.push(
    solanaStakePool.StakePoolInstruction.depositSol({
      stakePool: stakePoolAddress,
      reserveStake: stakePool.reserveStake,
      fundingAccount: userSolTransfer.publicKey,
      destinationPoolAccount: destinationTokenAccount,
      managerFeeAccount: stakePool.managerFeeAccount,
      referralPoolAccount: referrerTokenAccount ?? destinationTokenAccount,
      poolMint: stakePool.poolMint,
      lamports: lamports.toNumber(),
      withdrawAuthority,
      depositAuthority,
    })
  );

  return {
    instructions,
    signers,
  };
}

/**
 * Creates instructions required to deposit stake to stake pool.
 */
export async function makeDepositStakeToStakePoolIx(
  stakePool: solanaStakePool.StakePool,
  stakePoolAddress: PublicKey,
  walletAddress: PublicKey,
  validatorVote: PublicKey,
  depositStake: PublicKey,
  priorityFee?: number
) {
  const withdrawAuthority = findWithdrawAuthorityProgramAddress(
    solanaStakePool.STAKE_POOL_PROGRAM_ID,
    stakePoolAddress
  );

  const validatorStake = findStakeProgramAddress(
    solanaStakePool.STAKE_POOL_PROGRAM_ID,
    validatorVote,
    stakePoolAddress
  );

  const instructions: TransactionInstruction[] = [];
  const signers: Signer[] = [];

  const poolMint = stakePool.poolMint;

  const poolTokenReceiverAccount = getAssociatedTokenAddressSync(poolMint, walletAddress, true);
  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(walletAddress, poolTokenReceiverAccount, walletAddress, poolMint)
  );

  // Priority fees
  instructions.push(...makePriorityFeeIx(priorityFee));

  instructions.push(
    ...StakeProgram.authorize({
      stakePubkey: depositStake,
      authorizedPubkey: walletAddress,
      newAuthorizedPubkey: stakePool.stakeDepositAuthority,
      stakeAuthorizationType: StakeAuthorizationLayout.Staker,
    }).instructions
  );

  instructions.push(
    ...StakeProgram.authorize({
      stakePubkey: depositStake,
      authorizedPubkey: walletAddress,
      newAuthorizedPubkey: stakePool.stakeDepositAuthority,
      stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
    }).instructions
  );

  instructions.push(
    solanaStakePool.StakePoolInstruction.depositStake({
      stakePool: stakePoolAddress,
      validatorList: stakePool.validatorList,
      depositAuthority: stakePool.stakeDepositAuthority,
      reserveStake: stakePool.reserveStake,
      managerFeeAccount: stakePool.managerFeeAccount,
      referralPoolAccount: poolTokenReceiverAccount,
      destinationPoolAccount: poolTokenReceiverAccount,
      withdrawAuthority,
      depositStake,
      validatorStake,
      poolMint,
    })
  );

  return {
    instructions,
    signers,
  };
}

/**
 * Generates the withdraw authority program address for the stake pool
 */
function findWithdrawAuthorityProgramAddress(programId: PublicKey, stakePoolAddress: PublicKey) {
  const [publicKey] = PublicKey.findProgramAddressSync(
    [stakePoolAddress.toBuffer(), Buffer.from("withdraw")],
    programId
  );
  return publicKey;
}

/**
 * Generates the stake program address for a validator's vote account
 */
function findStakeProgramAddress(programId: PublicKey, voteAccountAddress: PublicKey, stakePoolAddress: PublicKey) {
  const [publicKey] = PublicKey.findProgramAddressSync(
    [voteAccountAddress.toBuffer(), stakePoolAddress.toBuffer()],
    programId
  );
  return publicKey;
}

/**
 * Generates the stake program address for a validator's vote account
 */
function makePriorityFeeIx(priorityFeeUi?: number): TransactionInstruction[] {
  const priorityFeeIx: TransactionInstruction[] = [];
  const limitCU = 1_400_000;

  let microLamports: number = 1;

  if (priorityFeeUi) {
    const priorityFeeMicroLamports = priorityFeeUi * LAMPORTS_PER_SOL * 1_000_000;
    microLamports = Math.round(priorityFeeMicroLamports / limitCU);
  }

  priorityFeeIx.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports,
    })
  );

  return priorityFeeIx;
}
