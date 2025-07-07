import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  STAKE_CONFIG_ID,
  SYSVAR_CLOCK_PUBKEY,
  SystemProgram,
  StakeProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { BN } from "bn.js";

import {
  TOKEN_PROGRAM_ID,
  MPL_METADATA_PROGRAM_ID,
  SINGLE_POOL_PROGRAM_ID,
  STAKE_PROGRAM_ID,
  SYSVAR_CLOCK_ID,
  SYSVAR_RENT_ID,
  SYSVAR_STAKE_HISTORY_ID,
  SYSTEM_PROGRAM_ID,
  addTransactionMetadata,
  TransactionType,
} from "@mrgnlabs/mrgn-common";
import { SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

interface AccountMeta {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
}

// Instruction type enum
enum SinglePoolInstructionType {
  InitializePool = 0,
  ReplenishPool,
  DepositStake,
  WithdrawStake,
  CreateTokenMetadata,
  UpdateTokenMetadata,
  InitializeOnRamp,
}

const SinglePoolInstruction = {
  initializePool: (voteAccount: PublicKey): TransactionInstruction => {
    const pool = findPoolAddress(voteAccount);
    const stake = findPoolStakeAddress(pool);
    const mint = findPoolMintAddress(pool);
    const stakeAuthority = findPoolStakeAuthorityAddress(pool);
    const mintAuthority = findPoolMintAuthorityAddress(pool);

    return createTransactionInstruction(
      SINGLE_POOL_PROGRAM_ID,
      [
        { pubkey: voteAccount, isSigner: false, isWritable: false },
        { pubkey: pool, isSigner: false, isWritable: true },
        { pubkey: stake, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: stakeAuthority, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_STAKE_HISTORY_ID, isSigner: false, isWritable: false },
        { pubkey: STAKE_CONFIG_ID, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: STAKE_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      Buffer.from([SinglePoolInstructionType.InitializePool])
    );
  },

  initializeOnRamp: (pool: PublicKey): TransactionInstruction => {
    const onRamp = findPoolOnRampAddress(pool);
    const stakeAuthority = findPoolStakeAuthorityAddress(pool);

    return createTransactionInstruction(
      SINGLE_POOL_PROGRAM_ID,
      [
        { pubkey: pool, isSigner: false, isWritable: false },
        { pubkey: onRamp, isSigner: false, isWritable: true },
        { pubkey: stakeAuthority, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_ID, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: STAKE_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      Buffer.from([SinglePoolInstructionType.InitializeOnRamp])
    );
  },

  depositStake: async (
    pool: PublicKey,
    userStakeAccount: PublicKey,
    userTokenAccount: PublicKey,
    userLamportAccount: PublicKey
  ): Promise<TransactionInstruction> => {
    const stake = findPoolStakeAddress(pool);
    const mint = findPoolMintAddress(pool);
    const stakeAuthority = findPoolStakeAuthorityAddress(pool);
    const mintAuthority = findPoolMintAuthorityAddress(pool);

    return createTransactionInstruction(
      SINGLE_POOL_PROGRAM_ID,
      [
        { pubkey: pool, isSigner: false, isWritable: false },
        { pubkey: stake, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: stakeAuthority, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: userStakeAccount, isSigner: false, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userLamportAccount, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_STAKE_HISTORY_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: STAKE_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      Buffer.from([SinglePoolInstructionType.DepositStake])
    );
  },

  withdrawStake: async (
    pool: PublicKey,
    userStakeAccount: PublicKey,
    userStakeAuthority: PublicKey,
    userTokenAccount: PublicKey,
    tokenAmount: BigNumber
  ): Promise<TransactionInstruction> => {
    const stake = findPoolStakeAddress(pool);
    const mint = findPoolMintAddress(pool);
    const stakeAuthority = findPoolStakeAuthorityAddress(pool);
    const mintAuthority = findPoolMintAuthorityAddress(pool);

    // Try using BigInt for more precise conversion
    const rawAmount = BigInt(tokenAmount.multipliedBy(1e9).toString());

    const data = Buffer.concat([
      Buffer.from([SinglePoolInstructionType.WithdrawStake]),
      userStakeAuthority.toBuffer(),
      Buffer.from(new BN(rawAmount.toString()).toArray("le", 8)),
    ]);

    return createTransactionInstruction(
      SINGLE_POOL_PROGRAM_ID,
      [
        { pubkey: pool, isSigner: false, isWritable: false },
        { pubkey: stake, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: stakeAuthority, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: userStakeAccount, isSigner: false, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_CLOCK_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: STAKE_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data
    );
  },

  createTokenMetadata: async (pool: PublicKey, payer: PublicKey): Promise<TransactionInstruction> => {
    const mint = findPoolMintAddress(pool);
    const [mintAuthority, mplAuthority, mplMetadata] = await Promise.all([
      findPoolMintAuthorityAddress(pool),
      findPoolMplAuthorityAddress(pool),
      findMplMetadataAddress(mint),
    ]);

    return createTransactionInstruction(
      SINGLE_POOL_PROGRAM_ID,
      [
        { pubkey: pool, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: mplAuthority, isSigner: false, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: mplMetadata, isSigner: false, isWritable: true },
        { pubkey: MPL_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      Buffer.from([SinglePoolInstructionType.CreateTokenMetadata])
    );
  },

  updateTokenMetadata: async (
    voteAccount: PublicKey,
    authorizedWithdrawer: PublicKey,
    tokenName: string,
    tokenSymbol: string,
    tokenUri: string = ""
  ): Promise<TransactionInstruction> => {
    if (tokenName.length > 32) {
      throw new Error("maximum token name length is 32 characters");
    }
    if (tokenSymbol.length > 10) {
      throw new Error("maximum token symbol length is 10 characters");
    }
    if (tokenUri.length > 200) {
      throw new Error("maximum token uri length is 200 characters");
    }

    const pool = findPoolAddress(voteAccount);
    const [mint, mplAuthority] = await Promise.all([findPoolMintAddress(pool), findPoolMplAuthorityAddress(pool)]);
    const mplMetadata = await findMplMetadataAddress(mint);

    const data = Buffer.concat([
      Buffer.from([SinglePoolInstructionType.UpdateTokenMetadata]),
      Buffer.from(new Uint32Array([tokenName.length]).buffer),
      Buffer.from(tokenName),
      Buffer.from(new Uint32Array([tokenSymbol.length]).buffer),
      Buffer.from(tokenSymbol),
      Buffer.from(new Uint32Array([tokenUri.length]).buffer),
      Buffer.from(tokenUri),
    ]);

    return createTransactionInstruction(
      SINGLE_POOL_PROGRAM_ID,
      [
        { pubkey: voteAccount, isSigner: false, isWritable: false },
        { pubkey: pool, isSigner: false, isWritable: false },
        { pubkey: mplAuthority, isSigner: false, isWritable: false },
        { pubkey: authorizedWithdrawer, isSigner: true, isWritable: false },
        { pubkey: mplMetadata, isSigner: false, isWritable: true },
        { pubkey: MPL_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data
    );
  },
};

const createTransactionInstruction = (
  programId: PublicKey,
  keys: AccountMeta[],
  data: Buffer
): TransactionInstruction => {
  return {
    programId,
    keys,
    data,
  };
};

const findPda = (baseAddress: PublicKey, prefix: string, programId: PublicKey = SINGLE_POOL_PROGRAM_ID): PublicKey => {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from(prefix), baseAddress.toBuffer()], programId);
  return pda;
};

const findPoolMintAddressByVoteAccount = (voteAccountAddress: PublicKey): PublicKey =>
  findPda(findPoolAddress(voteAccountAddress), "mint");
const findPoolAddress = (voteAccountAddress: PublicKey): PublicKey => findPda(voteAccountAddress, "pool");
const findPoolMintAddress = (poolAddress: PublicKey): PublicKey => findPda(poolAddress, "mint");
const findPoolStakeAddress = (poolAddress: PublicKey): PublicKey => findPda(poolAddress, "stake");
const findPoolStakeAuthorityAddress = (poolAddress: PublicKey): PublicKey => findPda(poolAddress, "stake_authority");
const findPoolMintAuthorityAddress = (poolAddress: PublicKey): PublicKey => findPda(poolAddress, "mint_authority");
const findPoolMplAuthorityAddress = (poolAddress: PublicKey): PublicKey => findPda(poolAddress, "mpl_authority");
const findPoolOnRampAddress = (poolAddress: PublicKey): PublicKey => findPda(poolAddress, "onramp");

const findMplMetadataAddress = async (poolMintAddress: PublicKey): Promise<PublicKey> => {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), MPL_METADATA_PROGRAM_ID.toBuffer(), poolMintAddress.toBuffer()],
    MPL_METADATA_PROGRAM_ID
  );
  return pda;
};

const SINGLE_POOL_ACCOUNT_SIZE = BigInt(33);
const STAKE_ACCOUNT_SIZE = BigInt(200);
const MINT_SIZE = BigInt(82);

async function initializeStakedPoolTx(connection: Connection, payer: PublicKey, voteAccountAddress: PublicKey) {
  const instructions = await initializeStakedPoolIxs(connection, payer, voteAccountAddress);
  const tx = new Transaction().add(...instructions);
  return tx;
}

async function initializeStakedPoolIxs(connection: Connection, payer: PublicKey, voteAccountAddress: PublicKey) {
  const poolAddress = findPoolAddress(voteAccountAddress);

  const stakeAddress = findPoolStakeAddress(poolAddress);
  const mintAddress = findPoolMintAddress(poolAddress);
  const onRampAddress = findPoolOnRampAddress(poolAddress);

  // get min rent
  const [poolRent, stakeRent, mintRent, minimumDelegationObj] = await Promise.all([
    connection.getMinimumBalanceForRentExemption(Number(SINGLE_POOL_ACCOUNT_SIZE), "confirmed"),
    connection.getMinimumBalanceForRentExemption(Number(STAKE_ACCOUNT_SIZE), "confirmed"),
    connection.getMinimumBalanceForRentExemption(Number(MINT_SIZE), "confirmed"),
    connection.getStakeMinimumDelegation(),
  ]);

  const minimumDelegation = minimumDelegationObj.value;

  const instructions: TransactionInstruction[] = [];

  // instructions
  instructions.push(SystemProgram.transfer({ fromPubkey: payer, toPubkey: poolAddress, lamports: poolRent }));
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: stakeAddress,
      lamports: stakeRent + minimumDelegation + LAMPORTS_PER_SOL * 1,
    })
  );
  instructions.push(SystemProgram.transfer({ fromPubkey: payer, toPubkey: onRampAddress, lamports: stakeRent }));
  instructions.push(SystemProgram.transfer({ fromPubkey: payer, toPubkey: mintAddress, lamports: mintRent }));

  instructions.push(SinglePoolInstruction.initializePool(voteAccountAddress));
  instructions.push(SinglePoolInstruction.initializeOnRamp(poolAddress));
  instructions.push(await SinglePoolInstruction.createTokenMetadata(poolAddress, payer));

  return instructions;
}

const createAccountIx = (
  from: PublicKey,
  newAccount: PublicKey,
  lamports: number,
  space: number,
  programAddress: PublicKey
) => {
  const data = Buffer.concat([
    Buffer.from([0]), // Assuming the first byte is an instruction type or similar
    Buffer.from(new BN(lamports).toArray("le", 8)),
    Buffer.from(new BN(space).toArray("le", 8)),
    programAddress.toBuffer(),
  ]);

  const accounts = [
    { pubkey: from, isSigner: true, isWritable: true },
    { pubkey: newAccount, isSigner: true, isWritable: true },
  ];

  return createTransactionInstruction(SYSTEM_PROGRAM_ID, accounts, data);
};

const createPoolOnrampIx = (voteAccount: PublicKey): TransactionInstruction => {
  const poolAccount = findPoolAddress(voteAccount);
  const onRampAccount = findPoolOnRampAddress(poolAccount);
  const poolStakeAuthority = findPoolStakeAuthorityAddress(poolAccount);

  const keys = [
    { pubkey: poolAccount, isSigner: false, isWritable: false },
    { pubkey: onRampAccount, isSigner: false, isWritable: true },
    { pubkey: poolStakeAuthority, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
  ];

  // TODO don't hard code the instruction index? (or why not, it's not gna change is it?)
  const data = Buffer.from(Uint8Array.of(6));

  return new TransactionInstruction({
    keys,
    programId: SINGLE_POOL_PROGRAM_ID,
    data,
  });
};

const replenishPoolIx = (voteAccount: PublicKey): TransactionInstruction => {
  const poolAccount = findPoolAddress(voteAccount);
  const stakePool = findPoolStakeAddress(poolAccount);
  const onRampPool = findPoolOnRampAddress(poolAccount);
  const authority = findPoolStakeAuthorityAddress(poolAccount);

  const keys = [
    { pubkey: voteAccount, isSigner: false, isWritable: false },
    { pubkey: poolAccount, isSigner: false, isWritable: false },
    { pubkey: stakePool, isSigner: false, isWritable: true },
    { pubkey: onRampPool, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_STAKE_HISTORY_ID, isSigner: false, isWritable: false },
    { pubkey: STAKE_CONFIG_ID, isSigner: false, isWritable: false },
    { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
  ];

  // TODO don't hard code the instruction index? (or why not, it's not gna change is it?)
  const data = Buffer.from(Uint8Array.of(1));

  return createTransactionInstruction(SINGLE_POOL_PROGRAM_ID, keys, data);
};

export {
  SinglePoolInstruction,
  initializeStakedPoolIxs,
  initializeStakedPoolTx,
  findPoolAddress,
  findPoolMintAddress,
  findPoolStakeAddress,
  findPoolStakeAuthorityAddress,
  findPoolMintAuthorityAddress,
  findPoolMplAuthorityAddress,
  findMplMetadataAddress,
  findPoolOnRampAddress,
  findPoolMintAddressByVoteAccount,
  createAccountIx,
  createPoolOnrampIx,
  replenishPoolIx,
};
