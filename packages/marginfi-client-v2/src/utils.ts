import { PublicKey } from "@solana/web3.js";
import {
  PDA_BANK_FEE_VAULT_AUTH_SEED,
  PDA_BANK_FEE_VAULT_SEED,
  PDA_BANK_INSURANCE_VAULT_AUTH_SEED,
  PDA_BANK_INSURANCE_VAULT_SEED,
  PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED,
  PDA_BANK_LIQUIDITY_VAULT_SEED,
  WSOL_MINT,
} from "./constants";
import {
  AccountSummary,
  BankInfo,
  BankVaultType,
  ExtendedBankInfo,
  TokenAccount,
  TokenMetadata,
  UserPosition,
} from "./types";
import MarginfiAccount, { Balance, MarginRequirementType } from "./account";
import { Bank, PriceBias } from "./bank";
import { nativeToUi } from "@mrgnlabs/mrgn-common";

export function getBankVaultSeeds(type: BankVaultType): Buffer {
  switch (type) {
    case BankVaultType.LiquidityVault:
      return PDA_BANK_LIQUIDITY_VAULT_SEED;
    case BankVaultType.InsuranceVault:
      return PDA_BANK_INSURANCE_VAULT_SEED;
    case BankVaultType.FeeVault:
      return PDA_BANK_FEE_VAULT_SEED;
    default:
      throw Error(`Unknown vault type ${type}`);
  }
}

function getBankVaultAuthoritySeeds(type: BankVaultType): Buffer {
  switch (type) {
    case BankVaultType.LiquidityVault:
      return PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED;
    case BankVaultType.InsuranceVault:
      return PDA_BANK_INSURANCE_VAULT_AUTH_SEED;
    case BankVaultType.FeeVault:
      return PDA_BANK_FEE_VAULT_AUTH_SEED;
    default:
      throw Error(`Unknown vault type ${type}`);
  }
}

/**
 * Compute authority PDA for a specific marginfi group bank vault
 */
export function getBankVaultAuthority(
  bankVaultType: BankVaultType,
  bankPk: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([getBankVaultAuthoritySeeds(bankVaultType), bankPk.toBuffer()], programId);
}

export function floor(value: number, decimals: number): number {
  return Math.floor(value * 10 ** decimals) / 10 ** decimals;
}

export function ceil(value: number, decimals: number): number {
  return Math.ceil(value * 10 ** decimals) / 10 ** decimals;
}

const DEFAULT_ACCOUNT_SUMMARY = {
  balance: 0,
  lendingAmount: 0,
  borrowingAmount: 0,
  apy: 0,
  positions: [],
};

function computeAccountSummary(marginfiAccount: MarginfiAccount): AccountSummary {
  const equityComponents = marginfiAccount.getHealthComponents(MarginRequirementType.Equity);

  return {
    balance: equityComponents.assets.minus(equityComponents.liabilities).toNumber(),
    lendingAmount: equityComponents.assets.toNumber(),
    borrowingAmount: equityComponents.liabilities.toNumber(),
    apy: marginfiAccount.computeNetApy(),
  };
}

function makeBankInfo(bank: Bank, tokenMetadata: TokenMetadata): BankInfo {
  const { lendingRate, borrowingRate } = bank.getInterestRates();
  const totalPoolDeposits = nativeToUi(bank.totalAssets, bank.mintDecimals);
  const totalPoolBorrows = nativeToUi(bank.totalLiabilities, bank.mintDecimals);
  const liquidity = totalPoolDeposits - totalPoolBorrows;
  const utilizationRate = totalPoolDeposits > 0 ? (totalPoolBorrows / totalPoolDeposits) * 100 : 0;

  return {
    address: bank.publicKey,
    tokenIcon: tokenMetadata.icon,
    tokenName: bank.label,
    tokenPrice: bank.getPrice(PriceBias.None).toNumber(),
    tokenMint: bank.mint,
    tokenMintDecimals: bank.mintDecimals,
    lendingRate: lendingRate.toNumber(),
    borrowingRate: borrowingRate.toNumber(),
    totalPoolDeposits,
    totalPoolBorrows,
    availableLiquidity: liquidity,
    utilizationRate,
    bank,
  };
}

function makeExtendedBankInfo(
  bankInfo: BankInfo,
  tokenAccount: TokenAccount,
  nativeSolBalance: number,
  marginfiAccount: any
): ExtendedBankInfo {
  const isWrappedSol = bankInfo.tokenMint.equals(WSOL_MINT);
  const positionRaw = marginfiAccount?.activeBalances.find((balance: Balance) =>
    balance.bankPk.equals(bankInfo.address)
  );
  const hasActivePosition = !!positionRaw;
  const position = hasActivePosition ? makeUserPosition(positionRaw, bankInfo) : null;

  const tokenBalance = tokenAccount.balance;

  const maxDeposit = floor(
    isWrappedSol ? Math.max(tokenBalance + nativeSolBalance, 0) : tokenBalance,
    bankInfo.tokenMintDecimals
  );
  const maxWithdraw = floor(
    // Math.min(marginfiAccount?.getMaxWithdrawForBank(bankInfo.bank).toNumber() ?? 0, bankInfo.availableLiquidity),
    Math.min(position?.amount ?? 0, bankInfo.availableLiquidity), // TODO: FIX
    bankInfo.tokenMintDecimals
  );
  const maxBorrow = floor(
    Math.min((marginfiAccount?.getMaxBorrowForBank(bankInfo.bank).toNumber() ?? 0) * 0.95, bankInfo.availableLiquidity),
    bankInfo.tokenMintDecimals
  );
  let maxRepay: number;
  if (isWrappedSol) {
    maxRepay = !!position ? Math.min(position.amount, maxDeposit) : maxDeposit;
  } else {
    maxRepay = !!position ? Math.min(position.amount, maxDeposit) : maxDeposit;
  }

  const base = {
    ...bankInfo,
    hasActivePosition,
    tokenBalance,
    maxDeposit,
    maxRepay,
    maxWithdraw,
    maxBorrow,
  };

  return !!position
    ? {
        ...base,
        hasActivePosition: true,
        position,
      }
    : {
        ...base,
        hasActivePosition: false,
      };
}

function makeUserPosition(balance: Balance, bankInfo: BankInfo): UserPosition {
  const amounts = balance.getQuantity(bankInfo.bank);
  const usdValues = balance.getUsdValue(bankInfo.bank, MarginRequirementType.Equity);
  const isLending = usdValues.liabilities.isZero();
  return {
    amount: isLending
      ? nativeToUi(amounts.assets.toNumber(), bankInfo.tokenMintDecimals)
      : nativeToUi(amounts.liabilities.toNumber(), bankInfo.tokenMintDecimals),
    usdValue: isLending ? usdValues.assets.toNumber() : usdValues.liabilities.toNumber(),
    isLending,
  };
}

export { DEFAULT_ACCOUNT_SUMMARY, computeAccountSummary, makeBankInfo, makeExtendedBankInfo };
