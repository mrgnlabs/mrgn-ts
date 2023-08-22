import {
  Bank,
  BankMap,
  MarginfiAccount,
  MarginRequirementType,
  PriceBias,
  OraclePrice,
  OraclePriceMap,
} from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, BankInfo, ExtendedBankInfo, TokenAccount, TokenMetadata, UserPosition } from "~/types";
import { WSOL_MINT } from "~/config";
import { floor } from "~/utils";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import { Balance } from "@mrgnlabs/marginfi-client-v2/dist/models/balance";

const DEFAULT_ACCOUNT_SUMMARY = {
  balance: 0,
  lendingAmount: 0,
  borrowingAmount: 0,
  apy: 0,
  positions: [],
};

function computeAccountSummary(
  banks: BankMap,
  priceInfos: OraclePriceMap,
  marginfiAccount: MarginfiAccount
): AccountSummary {
  const equityComponents = marginfiAccount.computeHealthComponents(banks, priceInfos, MarginRequirementType.Equity);

  return {
    balance: equityComponents.assets.minus(equityComponents.liabilities).toNumber(),
    lendingAmount: equityComponents.assets.toNumber(),
    borrowingAmount: equityComponents.liabilities.toNumber(),
    apy: marginfiAccount.computeNetApy(banks, priceInfos),
  };
}

function makeBankInfo(bank: Bank, priceInfo: OraclePrice, tokenMetadata: TokenMetadata, tokenSymbol: string): BankInfo {
  const { lendingRate, borrowingRate } = bank.computeInterestRates();
  const totalPoolDeposits = nativeToUi(bank.getTotalAssetQuantity(), bank.mintDecimals);
  const totalPoolBorrows = nativeToUi(bank.getTotalLiabilityQuantity(), bank.mintDecimals);
  const liquidity = totalPoolDeposits - totalPoolBorrows;
  const utilizationRate = totalPoolDeposits > 0 ? (totalPoolBorrows / totalPoolDeposits) * 100 : 0;

  return {
    address: bank.address,
    tokenIcon: tokenMetadata.icon,
    tokenSymbol,
    tokenPrice: bank.getPrice(priceInfo, PriceBias.None).toNumber(),
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
  priceInfo: OraclePrice,
  tokenAccount: TokenAccount,
  nativeSolBalance: number,
  marginfiAccount: any
): ExtendedBankInfo {
  const isWrappedSol = bankInfo.tokenMint.equals(WSOL_MINT);
  const positionRaw = marginfiAccount?.activeBalances.find((balance: Balance) =>
    balance.bankPk.equals(bankInfo.address)
  );
  const hasActivePosition = !!positionRaw;
  const position = hasActivePosition ? makeUserPosition(positionRaw, bankInfo, priceInfo) : null;

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

function makeUserPosition(balance: Balance, bankInfo: BankInfo, priceInfo: OraclePrice): UserPosition {
  const amounts = balance.computeQuantity(bankInfo.bank);
  const usdValues = balance.computeUsdValue(bankInfo.bank, priceInfo, MarginRequirementType.Equity);
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
