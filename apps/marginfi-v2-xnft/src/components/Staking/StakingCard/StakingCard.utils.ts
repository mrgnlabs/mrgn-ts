import {
  Keypair,
  PublicKey,
  Signer,
  StakeAuthorizationLayout,
  StakeProgram,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import * as solanaStakePool from "@solana/spl-stake-pool";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/mrgn-common";
import BN from "bn.js";

import { TokenData } from "~/store/lstStore";
import { StakeData } from "~/utils";

/**
 * Types
 */

export type OngoingAction = "swapping" | "minting";

export type DepositOption =
  | {
      type: "native";
      amount: BN;
      maxAmount: BN;
    }
  | {
      type: "token";
      tokenData: TokenData;
      amount: BN;
    }
  | {
      type: "stake";
      stakeData: StakeData;
    };

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
 * Creates instructions required to deposit stake to stake pool.
 */
export async function makeDepositStakeToStakePoolIx(
  stakePool: solanaStakePool.StakePool,
  stakePoolAddress: PublicKey,
  walletAddress: PublicKey,
  validatorVote: PublicKey,
  depositStake: PublicKey
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

export function makeTokenAmountFormatter(decimals: number) {
  return new Intl.NumberFormat("en-US", {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
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
  depositAuthority?: PublicKey
) {
  // Ephemeral SOL account just to do the transfer
  const userSolTransfer = new Keypair();
  const signers: Signer[] = [userSolTransfer];
  const instructions: TransactionInstruction[] = [];

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

  if (!destinationTokenAccount) {
    throw Error("destinationTokenAccount not found");
  }

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
