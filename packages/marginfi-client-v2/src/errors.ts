import { LangErrorMessage } from "@coral-xyz/anchor";
import { JUPITER_V6_PROGRAM, TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { MARGINFI_IDL } from "./idl";
import { PublicKey } from "@solana/web3.js";

export enum ProcessTransactionErrorType {
  TransactionBuildingError,
  SimulationError,
  FallthroughError,
  TimeoutError,
}

export class ProcessTransactionError extends Error {
  logs?: string[];
  type: ProcessTransactionErrorType;
  programId?: string;

  constructor(message: string, type: ProcessTransactionErrorType, logs?: string[], programId?: string) {
    super(message);
    this.programId = programId;
    this.type = type;
    this.logs = logs;
  }
}

export interface ProgramError {
  programId: string;
  code: number;
}

export interface ProgramErrorWithDescription extends ProgramError {
  description: string;
}

const MFI_ERROR_CODE_MAP: Map<number, string> = new Map(MARGINFI_IDL.errors.map((error) => [error.code, error.msg]));

export function parseTransactionError(error: any, mfiProgramId: PublicKey) {
  const logs = error?.logs;
  const name = error?.name;
  let message = error?.transactionMessage ?? error?.message ?? error?.err;
  let programId = error?.programId;
  let code = error?.code;

  if (message) {
    message = message.replace(/\\"/g, '"').replace(/^"|"$/g, "");
  }

  if (logs) {
    const parsedError = parseErrorFromLogs(logs, mfiProgramId);
    if (parsedError) {
      message = parsedError.description;
      programId = parsedError.programId;
      code = parsedError.code;
    }
  }

  return {
    programId: programId,
    type: name,
    description: message,
    code: code,
  };
}

export function parseErrorFromLogs(logs: string[], mfiProgramId: PublicKey): ProgramErrorWithDescription | null {
  const customError = parseCustomProgramError(logs, mfiProgramId);
  if (customError) return customError;

  return null;
}

function parseCustomProgramError(logs: string[], mfiProgramId: PublicKey): ProgramErrorWithDescription | null {
  const error = parseCustomProgramErrorFromLogs(logs);
  if (error === null) {
    return null;
  }

  let errorMsg: string | undefined = undefined;

  if (error.programId === mfiProgramId.toBase58()) {
    const mfiError = MFI_ERROR_CODE_MAP.get(error.code);
    if (mfiError !== undefined) {
      return { code: error.code, programId: error.programId, description: mfiError };
    }
  }

  let programErrors = ERROR_CODE_MAPS.get(error.programId);
  if (programErrors !== undefined) {
    errorMsg = programErrors.get(error.code);
    if (errorMsg !== undefined) {
      return { code: error.code, programId: error.programId, description: errorMsg };
    }
  }

  errorMsg = LangErrorMessage.get(error.code);
  if (errorMsg !== undefined) {
    return { code: error.code, programId: error.programId, description: errorMsg };
  }

  return null;
}

function parseCustomProgramErrorFromLogs(logs: string[]): ProgramError | null {
  const log = logs.find((log) => log.includes("failed: custom program error"));
  if (!log) return null;
  const regex = /^Program (?<program>\S+) failed: custom program error: (?<code>0x[0-9a-fA-F]+)/g;
  const match = regex.exec(log);
  if (!match?.groups) return null;
  const code = parseInt(match.groups.code);
  return { programId: match.groups.program, code };
}

enum TokenErrorCode {
  NotRentExempt = 0,
  InsufficientFunds = 1,
  InvalidMint = 2,
  MintMismatch = 3,
  OwnerMismatch = 4,
  FixedSupply = 5,
  AlreadyInUse = 6,
  InvalidNumberOfProvidedSigners = 7,
  InvalidNumberOfRequiredSigners = 8,
  UninitializedState = 9,
  NativeNotSupported = 10,
  NonNativeHasBalance = 11,
  InvalidInstruction = 12,
  InvalidState = 13,
  Overflow = 14,
  AuthorityTypeNotSupported = 15,
  MintCannotFreeze = 16,
  AccountFrozen = 17,
  MintDecimalsMismatch = 18,
  NonNativeNotSupported = 19,
}

const TokenErrorCodeMap: Map<number, string> = new Map([
  [TokenErrorCode.NotRentExempt, "Lamport balance below rent-exempt threshold"],
  [TokenErrorCode.InsufficientFunds, "Insufficient funds"],
  [TokenErrorCode.InvalidMint, "Invalid Mint"],
  [TokenErrorCode.MintMismatch, "Account not associated with this Mint"],
  [TokenErrorCode.OwnerMismatch, "Owner does not match"],
  [TokenErrorCode.FixedSupply, "This token's supply is fixed and new tokens cannot be minted"],
  [TokenErrorCode.AlreadyInUse, "The account cannot be initialized because it is already being used"],
  [TokenErrorCode.InvalidNumberOfProvidedSigners, "Invalid number of provided signers"],
  [TokenErrorCode.InvalidNumberOfRequiredSigners, "Invalid number of required signers"],
  [TokenErrorCode.UninitializedState, "State is uninitialized"],
  [TokenErrorCode.NativeNotSupported, "Instruction does not support native tokens"],
  [TokenErrorCode.NonNativeHasBalance, "Non-native account can only be closed if its balance is zero"],
  [TokenErrorCode.InvalidInstruction, "Invalid instruction"],
  [TokenErrorCode.InvalidState, "State is invalid for requested operation"],
  [TokenErrorCode.Overflow, "Operation overflowed"],
  [TokenErrorCode.AuthorityTypeNotSupported, "Account does not support specified authority type"],
  [TokenErrorCode.MintCannotFreeze, "This token mint cannot freeze accounts"],
  [TokenErrorCode.AccountFrozen, "Account is frozen; all account operations will fail"],
  [TokenErrorCode.MintDecimalsMismatch, "Mint decimals mismatch between the client and mint"],
  [TokenErrorCode.NonNativeNotSupported, "Instruction does not support non-native tokens"],
]);

enum JupiterErrorCode {
  EmptyRoute = 6000,
  SlippageToleranceExceeded = 6001,
  InvalidCalculation = 6002,
  MissingPlatformFeeAccount = 6003,
  InvalidSlippage = 6004,
  NotEnoughPercent = 6005,
  InvalidInputIndex = 6006,
  InvalidOutputIndex = 6007,
  NotEnoughAccountKeys = 6008,
  NonZeroMinimumOutAmountNotSupported = 6009,
  InvalidRoutePlan = 6010,
  InvalidReferralAuthority = 6011,
  LedgerTokenAccountDoesNotMatch = 6012,
  InvalidTokenLedger = 6013,
  IncorrectTokenProgramID = 6014,
  TokenProgramNotProvided = 6015,
  SwapNotSupported = 6016,
  ExactOutAmountNotMatched = 6017,
  SourceAndDestinationMintCannotBeTheSame = 6018,
}

const JupiterErrorCodeMap: Map<number, string> = new Map([
  [JupiterErrorCode.EmptyRoute, "Empty route"],
  [JupiterErrorCode.SlippageToleranceExceeded, "Slippage tolerance exceeded"],
  [JupiterErrorCode.InvalidCalculation, "Invalid calculation"],
  [JupiterErrorCode.MissingPlatformFeeAccount, "Missing platform fee account"],
  [JupiterErrorCode.InvalidSlippage, "Invalid slippage"],
  [JupiterErrorCode.NotEnoughPercent, "Not enough percent to 100"],
  [JupiterErrorCode.InvalidInputIndex, "Token input index is invalid"],
  [JupiterErrorCode.InvalidOutputIndex, "Token output index is invalid"],
  [JupiterErrorCode.NotEnoughAccountKeys, "Not Enough Account keys"],
  [JupiterErrorCode.NonZeroMinimumOutAmountNotSupported, "Non zero minimum out amount not supported"],
  [JupiterErrorCode.InvalidRoutePlan, "Invalid route plan"],
  [JupiterErrorCode.InvalidReferralAuthority, "Invalid referral authority"],
  [JupiterErrorCode.LedgerTokenAccountDoesNotMatch, "Token account doesn't match the ledger"],
  [JupiterErrorCode.InvalidTokenLedger, "Invalid token ledger"],
  [JupiterErrorCode.IncorrectTokenProgramID, "Token program ID is invalid"],
  [JupiterErrorCode.TokenProgramNotProvided, "Token program not provided"],
  [JupiterErrorCode.SwapNotSupported, "Swap not supported"],
  [JupiterErrorCode.ExactOutAmountNotMatched, "Exact out amount doesn't match"],
  [JupiterErrorCode.SourceAndDestinationMintCannotBeTheSame, "Source mint and destination mint cannot the same"],
]);

const ERROR_CODE_MAPS: Map<string, Map<number, string>> = new Map([
  [TOKEN_PROGRAM_ID.toBase58(), TokenErrorCodeMap],
  [JUPITER_V6_PROGRAM.toBase58(), JupiterErrorCodeMap],
]);
