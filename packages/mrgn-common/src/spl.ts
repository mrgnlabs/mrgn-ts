import { struct, u32, u8 } from "@solana/buffer-layout";
import { bool, publicKey, u64 } from "@solana/buffer-layout-utils";
import {
  AccountInfo,
  AccountMeta,
  Commitment,
  Connection,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";

/** Information about a multisig */
export interface Multisig {
  /** Address of the multisig */
  address: PublicKey;
  /** Number of signers required */
  m: number;
  /** Number of possible signers, corresponds to the number of `signers` that are valid */
  n: number;
  /** Is this mint initialized */
  isInitialized: boolean;
  /** Full set of signers, of which `n` are valid */
  signer1: PublicKey;
  signer2: PublicKey;
  signer3: PublicKey;
  signer4: PublicKey;
  signer5: PublicKey;
  signer6: PublicKey;
  signer7: PublicKey;
  signer8: PublicKey;
  signer9: PublicKey;
  signer10: PublicKey;
  signer11: PublicKey;
}

/** Multisig as stored by the program */
export type RawMultisig = Omit<Multisig, "address">;

/** Buffer layout for de/serializing a multisig */
export const MultisigLayout = struct<RawMultisig>([
  u8("m"),
  u8("n"),
  bool("isInitialized"),
  publicKey("signer1"),
  publicKey("signer2"),
  publicKey("signer3"),
  publicKey("signer4"),
  publicKey("signer5"),
  publicKey("signer6"),
  publicKey("signer7"),
  publicKey("signer8"),
  publicKey("signer9"),
  publicKey("signer10"),
  publicKey("signer11"),
]);

/** Byte length of a multisig */
export const MULTISIG_SIZE = MultisigLayout.span;

export enum SplAccountType {
  Uninitialized,
  Mint,
  Account,
}

export const ACCOUNT_TYPE_SIZE = 1;

/** Base class for errors */
export abstract class TokenError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

/** Thrown if an account is not found at the expected address */
export class TokenAccountNotFoundError extends TokenError {
  name = "TokenAccountNotFoundError";
}

/** Thrown if a program state account is not a valid Account */
export class TokenInvalidAccountError extends TokenError {
  name = "TokenInvalidAccountError";
}

/** Thrown if a program state account is not owned by the expected token program */
export class TokenInvalidAccountOwnerError extends TokenError {
  name = "TokenInvalidAccountOwnerError";
}

/** Thrown if the byte length of an program state account doesn't match the expected size */
export class TokenInvalidAccountSizeError extends TokenError {
  name = "TokenInvalidAccountSizeError";
}

/** Thrown if the mint of a token account doesn't match the expected mint */
export class TokenInvalidMintError extends TokenError {
  name = "TokenInvalidMintError";
}

/** Thrown if the owner of a token account doesn't match the expected owner */
export class TokenInvalidOwnerError extends TokenError {
  name = "TokenInvalidOwnerError";
}

/** Thrown if the owner of a token account is a PDA (Program Derived Address) */
export class TokenOwnerOffCurveError extends TokenError {
  name = "TokenOwnerOffCurveError";
}

/** Thrown if an instruction's program is invalid */
export class TokenInvalidInstructionProgramError extends TokenError {
  name = "TokenInvalidInstructionProgramError";
}

/** Thrown if an instruction's keys are invalid */
export class TokenInvalidInstructionKeysError extends TokenError {
  name = "TokenInvalidInstructionKeysError";
}

/** Thrown if an instruction's data is invalid */
export class TokenInvalidInstructionDataError extends TokenError {
  name = "TokenInvalidInstructionDataError";
}

/** Thrown if an instruction's type is invalid */
export class TokenInvalidInstructionTypeError extends TokenError {
  name = "TokenInvalidInstructionTypeError";
}

/** Thrown if the program does not support the desired instruction */
export class TokenUnsupportedInstructionError extends TokenError {
  name = "TokenUnsupportedInstructionError";
}

/** Information about a token account */
export interface Account {
  /** Address of the account */
  address: PublicKey;
  /** Mint associated with the account */
  mint: PublicKey;
  /** Owner of the account */
  owner: PublicKey;
  /** Number of tokens the account holds */
  amount: bigint;
  /** Authority that can transfer tokens from the account */
  delegate: PublicKey | null;
  /** Number of tokens the delegate is authorized to transfer */
  delegatedAmount: bigint;
  /** True if the account is initialized */
  isInitialized: boolean;
  /** True if the account is frozen */
  isFrozen: boolean;
  /** True if the account is a native token account */
  isNative: boolean;
  /**
   * If the account is a native token account, it must be rent-exempt. The rent-exempt reserve is the amount that must
   * remain in the balance until the account is closed.
   */
  rentExemptReserve: bigint | null;
  /** Optional authority to close the account */
  closeAuthority: PublicKey | null;
  tlvData: Buffer;
}

/** Token account state as stored by the program */
export enum AccountState {
  Uninitialized = 0,
  Initialized = 1,
  Frozen = 2,
}

/** Token account as stored by the program */
export interface RawAccount {
  mint: PublicKey;
  owner: PublicKey;
  amount: bigint;
  delegateOption: 1 | 0;
  delegate: PublicKey;
  state: AccountState;
  isNativeOption: 1 | 0;
  isNative: bigint;
  delegatedAmount: bigint;
  closeAuthorityOption: 1 | 0;
  closeAuthority: PublicKey;
}

/** Buffer layout for de/serializing a token account */
export const AccountLayout = struct<RawAccount>([
  publicKey("mint"),
  publicKey("owner"),
  u64("amount"),
  u32("delegateOption"),
  publicKey("delegate"),
  u8("state"),
  u32("isNativeOption"),
  u64("isNative"),
  u64("delegatedAmount"),
  u32("closeAuthorityOption"),
  publicKey("closeAuthority"),
]);

/** Byte length of a token account */
export const ACCOUNT_SIZE = AccountLayout.span;

export const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");

/**
 * Retrieve information about a token account
 *
 * @param connection Connection to use
 * @param address    Token account
 * @param commitment Desired level of commitment for querying the state
 * @param programId  SPL Token program account
 *
 * @return Token account information
 */
export async function getAccount(
  connection: Connection,
  address: PublicKey,
  commitment?: Commitment,
  programId = TOKEN_PROGRAM_ID
): Promise<Account> {
  const info = await connection.getAccountInfo(address, commitment);
  return unpackAccount(address, info, programId);
}

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/**
 * Retrieve information about multiple token accounts in a single RPC call
 *
 * @param connection Connection to use
 * @param addresses  Token accounts
 * @param commitment Desired level of commitment for querying the state
 * @param programId  SPL Token program account
 *
 * @return Token account information
 */
export async function getMultipleAccounts(
  connection: Connection,
  addresses: PublicKey[],
  commitment?: Commitment,
  programId = TOKEN_PROGRAM_ID
): Promise<Account[]> {
  const infos = await connection.getMultipleAccountsInfo(addresses, commitment);
  return addresses.map((address, i) =>
    //@ts-ignore
    unpackAccount(address, infos[i], programId)
  );
}

/** Get the minimum lamport balance for a base token account to be rent exempt
 *
 * @param connection Connection to use
 * @param commitment Desired level of commitment for querying the state
 *
 * @return Amount of lamports required
 */
export async function getMinimumBalanceForRentExemptAccount(
  connection: Connection,
  commitment?: Commitment
): Promise<number> {
  return await getMinimumBalanceForRentExemptAccountWithExtensions(connection, [], commitment);
}

export enum ExtensionType {
  Uninitialized,
  TransferFeeConfig,
  TransferFeeAmount,
  MintCloseAuthority,
  ConfidentialTransferMint,
  ConfidentialTransferAccount,
  DefaultAccountState,
  ImmutableOwner,
  MemoTransfer,
  NonTransferable,
  InterestBearingMint,
}

export function getAccountLen(extensionTypes: ExtensionType[]): number {
  return getLen(extensionTypes, ACCOUNT_SIZE);
}

export const TYPE_SIZE = 2;
export const LENGTH_SIZE = 2;

function getLen(extensionTypes: ExtensionType[], baseSize: number): number {
  if (extensionTypes.length === 0) {
    return baseSize;
  } else {
    const accountLength = ACCOUNT_SIZE + ACCOUNT_TYPE_SIZE;
    if (accountLength === MULTISIG_SIZE) {
      return accountLength + TYPE_SIZE;
    } else {
      return accountLength;
    }
  }
}

/** Get the minimum lamport balance for a rent-exempt token account with extensions
 *
 * @param connection Connection to use
 * @param extensions
 * @param commitment Desired level of commitment for querying the state
 *
 * @return Amount of lamports required
 */
export async function getMinimumBalanceForRentExemptAccountWithExtensions(
  connection: Connection,
  extensions: ExtensionType[],
  commitment?: Commitment
): Promise<number> {
  const accountLen = getAccountLen(extensions);
  return await connection.getMinimumBalanceForRentExemption(accountLen, commitment);
}

/**
 * Unpack a token account
 *
 * @param address   Token account
 * @param info      Token account data
 * @param programId SPL Token program account
 *
 * @return Unpacked token account
 */
export function unpackAccount(
  address: PublicKey,
  info: AccountInfo<Buffer> | null,
  programId = TOKEN_PROGRAM_ID
): Account {
  if (!info) throw new TokenAccountNotFoundError();
  if (!info.owner.equals(programId)) throw new TokenInvalidAccountOwnerError();
  if (info.data.length < ACCOUNT_SIZE) throw new TokenInvalidAccountSizeError();

  const rawAccount = AccountLayout.decode(info.data.slice(0, ACCOUNT_SIZE));
  let tlvData = Buffer.alloc(0);
  if (info.data.length > ACCOUNT_SIZE) {
    if (info.data.length === MULTISIG_SIZE) throw new TokenInvalidAccountSizeError();
    if (info.data[ACCOUNT_SIZE] != SplAccountType.Account) throw new TokenInvalidAccountError();
    tlvData = info.data.slice(ACCOUNT_SIZE + ACCOUNT_TYPE_SIZE);
  }

  return {
    address,
    mint: rawAccount.mint,
    owner: rawAccount.owner,
    amount: rawAccount.amount,
    delegate: rawAccount.delegateOption ? rawAccount.delegate : null,
    delegatedAmount: rawAccount.delegatedAmount,
    isInitialized: rawAccount.state !== AccountState.Uninitialized,
    isFrozen: rawAccount.state === AccountState.Frozen,
    isNative: !!rawAccount.isNativeOption,
    rentExemptReserve: rawAccount.isNativeOption ? rawAccount.isNative : null,
    closeAuthority: rawAccount.closeAuthorityOption ? rawAccount.closeAuthority : null,
    tlvData,
  };
}

/** Address of the SPL Associated Token Account program */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

/**
 * Get the address of the associated token account for a given mint and owner
 *
 * @param mint                     Token mint account
 * @param owner                    Owner of the new account
 * @param allowOwnerOffCurve       Allow the owner account to be a PDA (Program Derived Address)
 * @param programId                SPL Token program account
 * @param associatedTokenProgramId SPL Associated Token program account
 *
 * @return Address of the associated token account
 */
export function getAssociatedTokenAddressSync(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): PublicKey {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) throw new TokenOwnerOffCurveError();

  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  );

  return address;
}

/**
 * Construct an AssociatedTokenAccount instruction
 *
 * @param payer                    Payer of the initialization fees
 * @param associatedToken          New associated token account
 * @param owner                    Owner of the new account
 * @param mint                     Token mint account
 * @param programId                SPL Token program account
 * @param associatedTokenProgramId SPL Associated Token program account
 *
 * @return Instruction to add to a transaction
 */
export function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: associatedTokenProgramId,
    data: Buffer.alloc(0),
  });
}

/**
 * Construct a CreateAssociatedTokenAccountIdempotent instruction
 *
 * @param payer                    Payer of the initialization fees
 * @param associatedToken          New associated token account
 * @param owner                    Owner of the new account
 * @param mint                     Token mint account
 * @param programId                SPL Token program account
 * @param associatedTokenProgramId SPL Associated Token program account
 *
 * @return Instruction to add to a transaction
 */
export function createAssociatedTokenAccountIdempotentInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): TransactionInstruction {
  return buildAssociatedTokenAccountInstruction(
    payer,
    associatedToken,
    owner,
    mint,
    Buffer.from([1]),
    programId,
    associatedTokenProgramId
  );
}

/** TODO: docs */
export interface SyncNativeInstructionData {
  instruction: TokenInstruction.SyncNative;
}

/** TODO: docs */
export const syncNativeInstructionData = struct<SyncNativeInstructionData>([u8("instruction")]);

/**
 * Construct a SyncNative instruction
 *
 * @param account   Native account to sync lamports from
 * @param programId SPL Token program account
 *
 * @return Instruction to add to a transaction
 */
export function createSyncNativeInstruction(account: PublicKey, programId = TOKEN_PROGRAM_ID): TransactionInstruction {
  const keys = [{ pubkey: account, isSigner: false, isWritable: true }];

  const data = Buffer.alloc(syncNativeInstructionData.span);
  syncNativeInstructionData.encode({ instruction: TokenInstruction.SyncNative }, data);

  return new TransactionInstruction({ keys, programId, data });
}

/** TODO: docs */
export interface CloseAccountInstructionData {
  instruction: TokenInstruction.CloseAccount;
}

/** TODO: docs */
export const closeAccountInstructionData = struct<CloseAccountInstructionData>([u8("instruction")]);

/**
 * Construct a CloseAccount instruction
 *
 * @param account      Account to close
 * @param destination  Account to receive the remaining balance of the closed account
 * @param authority    Account close authority
 * @param multiSigners Signing accounts if `authority` is a multisig
 * @param programId    SPL Token program account
 *
 * @return Instruction to add to a transaction
 */
export function createCloseAccountInstruction(
  account: PublicKey,
  destination: PublicKey,
  authority: PublicKey,
  multiSigners: Signer[] = [],
  programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
  const keys = addSigners(
    [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
    ],
    authority,
    multiSigners
  );

  const data = Buffer.alloc(closeAccountInstructionData.span);
  closeAccountInstructionData.encode({ instruction: TokenInstruction.CloseAccount }, data);

  return new TransactionInstruction({ keys, programId, data });
}

function buildAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  instructionData: Buffer,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: associatedTokenProgramId,
    data: instructionData,
  });
}

/** TODO: docs */
export interface TransferCheckedInstructionData {
  instruction: TokenInstruction.TransferChecked;
  amount: bigint;
  decimals: number;
}

/** TODO: docs */
export const transferCheckedInstructionData = struct<TransferCheckedInstructionData>([
  u8("instruction"),
  u64("amount"),
  u8("decimals"),
]);

/**
 * Construct a TransferChecked instruction
 *
 * @param source       Source account
 * @param mint         Mint account
 * @param destination  Destination account
 * @param owner        Owner of the source account
 * @param amount       Number of tokens to transfer
 * @param decimals     Number of decimals in transfer amount
 * @param multiSigners Signing accounts if `owner` is a multisig
 * @param programId    SPL Token program account
 *
 * @return Instruction to add to a transaction
 */
export function createTransferCheckedInstruction(
  source: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: number | bigint,
  decimals: number,
  multiSigners: Signer[] = [],
  programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
  const keys = addSigners(
    [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
    ],
    owner,
    multiSigners
  );

  const data = Buffer.alloc(transferCheckedInstructionData.span);
  transferCheckedInstructionData.encode(
    {
      instruction: TokenInstruction.TransferChecked,
      amount: BigInt(amount),
      decimals,
    },
    data
  );

  return new TransactionInstruction({ keys, programId, data });
}

/** Instructions defined by the program */
export enum TokenInstruction {
  InitializeAccount = 1,
  TransferChecked = 12,
  CloseAccount = 9,
  SyncNative = 17,
}

/** TODO: docs */
export interface InitializeAccountInstructionData {
  instruction: TokenInstruction.InitializeAccount;
}

export const initializeAccountInstructionData = struct<InitializeAccountInstructionData>([u8("instruction")]);

/**
 * Construct an InitializeAccount instruction
 *
 * @param account   New token account
 * @param mint      Mint account
 * @param owner     Owner of the new account
 * @param programId SPL Token program account
 *
 * @return Instruction to add to a transaction
 */
export function createInitializeAccountInstruction(
  account: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  programId = TOKEN_PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  const data = Buffer.alloc(initializeAccountInstructionData.span);
  initializeAccountInstructionData.encode({ instruction: TokenInstruction.InitializeAccount }, data);

  return new TransactionInstruction({ keys, programId, data });
}

/** @internal */
export function addSigners(keys: AccountMeta[], ownerOrAuthority: PublicKey, multiSigners: Signer[]): AccountMeta[] {
  if (multiSigners.length) {
    keys.push({ pubkey: ownerOrAuthority, isSigner: false, isWritable: false });
    for (const signer of multiSigners) {
      keys.push({
        pubkey: signer.publicKey,
        isSigner: true,
        isWritable: false,
      });
    }
  } else {
    keys.push({ pubkey: ownerOrAuthority, isSigner: true, isWritable: false });
  }
  return keys;
}

export interface Mint {
  /** Address of the mint */
  address: PublicKey;
  /**
   * Optional authority used to mint new tokens. The mint authority may only be provided during mint creation.
   * If no mint authority is present then the mint has a fixed supply and no further tokens may be minted.
   */
  mintAuthority: PublicKey | null;
  /** Total supply of tokens */
  supply: bigint;
  /** Number of base 10 digits to the right of the decimal place */
  decimals: number;
  /** Is this mint initialized */
  isInitialized: boolean;
  /** Optional authority to freeze token accounts */
  freezeAuthority: PublicKey | null;
}

/** Mint as stored by the program */
export interface RawMint {
  mintAuthorityOption: 1 | 0;
  mintAuthority: PublicKey;
  supply: bigint;
  decimals: number;
  isInitialized: boolean;
  freezeAuthorityOption: 1 | 0;
  freezeAuthority: PublicKey;
}

/** Buffer layout for de/serializing a mint */
export const MintLayout = struct<RawMint>([
  u32("mintAuthorityOption"),
  publicKey("mintAuthority"),
  u64("supply"),
  u8("decimals"),
  bool("isInitialized"),
  u32("freezeAuthorityOption"),
  publicKey("freezeAuthority"),
]);

/** Byte length of a mint */
export const MINT_SIZE = MintLayout.span;

/**
 * Retrieve information about a mint
 *
 * @param connection Connection to use
 * @param address    Mint account
 * @param commitment Desired level of commitment for querying the state
 * @param programId  SPL Token program account
 *
 * @return Mint information
 */
export async function getMint(
  connection: Connection,
  address: PublicKey,
  commitment?: Commitment,
  programId = TOKEN_PROGRAM_ID
): Promise<Mint> {
  const info = await connection.getAccountInfo(address, commitment);
  if (!info) throw new TokenAccountNotFoundError();
  if (!info.owner.equals(programId)) throw new TokenInvalidAccountOwnerError();
  if (info.data.length != MINT_SIZE) throw new TokenInvalidAccountSizeError();

  const rawMint = MintLayout.decode(info.data);

  return {
    address,
    mintAuthority: rawMint.mintAuthorityOption ? rawMint.mintAuthority : null,
    supply: rawMint.supply,
    decimals: rawMint.decimals,
    isInitialized: rawMint.isInitialized,
    freezeAuthority: rawMint.freezeAuthorityOption ? rawMint.freezeAuthority : null,
  };
}

export const MEMO_PROGRAM_ID: PublicKey = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * Creates and returns an instruction which validates a string of UTF-8
 * encoded characters and verifies that any accounts provided are signers of
 * the transaction.  The program also logs the memo, as well as any verified
 * signer addresses, to the transaction log, so that anyone can easily observe
 * memos and know they were approved by zero or more addresses by inspecting
 * the transaction log from a trusted provider.
 *
 * Public keys passed in via the signerPubkeys will identify Signers which
 * must subsequently sign the Transaction including the returned
 * TransactionInstruction in order for the transaction to be valid.
 *
 * @param memo The UTF-8 encoded memo string to validate
 * @param signerPubkeys An array of public keys which must sign the
 *        Transaction including the returned TransactionInstruction in order
 *        for the transaction to be valid and the memo verification to
 *        succeed.  null is allowed if there are no signers for the memo
 *        verification.
 **/
export function createMemoInstruction(memo: string, signerPubkeys?: Array<PublicKey>): TransactionInstruction {
  const keys =
    signerPubkeys == null
      ? []
      : signerPubkeys.map(function (key) {
          return { pubkey: key, isSigner: true, isWritable: false };
        });

  return new TransactionInstruction({
    keys: keys,
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf8"),
  });
}
