import { LangErrorMessage } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
import { IDL } from "./idl/marginfi-types";
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

  constructor(message: string, type: ProcessTransactionErrorType, logs?: string[]) {
    super(message);
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

const MFI_ERROR_CODE_MAP: Map<number, string> = new Map(IDL.errors.map((error) => [error.code, error.msg]));

export function parseErrorFromLogs(logs: string[], mfiProgramId: PublicKey): ProgramErrorWithDescription | null {
  const error = parseCustomProgramError(logs);
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

function parseCustomProgramError(logs: string[]): ProgramError | null {
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

const ERROR_CODE_MAPS: Map<string, Map<number, string>> = new Map([[TOKEN_PROGRAM_ID.toBase58(), TokenErrorCodeMap]]);
