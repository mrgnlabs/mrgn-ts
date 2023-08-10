import { Balance, Bank, MarginfiAccount, MarginRequirementType, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import {
  AccountSummary,
  BankInfo,
  Emissions,
  ExtendedBankInfo,
  TokenAccount,
  TokenMetadata,
  TokenPriceMap,
  UserPosition,
} from "~/types";
import { WSOL_MINT } from "~/config";
import { floor } from "~/utils";
import { getMint, nativeToUi } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { Connection, PublicKey } from "@solana/web3.js";
import * as firebaseApi from "./firebase";

const DEFAULT_ACCOUNT_SUMMARY = {
  balance: 0,
  lendingAmount: 0,
  borrowingAmount: 0,
  balanceUnbiased: 0,
  lendingAmountUnbiased: 0,
  borrowingAmountUnbiased: 0,
  lendingAmountWithBiasAndWeighted: 0,
  borrowingAmountWithBiasAndWeighted: 0,
  apy: 0,
  positions: [],
  outstandingUxpEmissions: 0,
};

function computeAccountSummary(marginfiAccount: MarginfiAccount, bankInfos: BankInfo[]): AccountSummary {
  const equityComponents = marginfiAccount.getHealthComponents(MarginRequirementType.Equity);
  const equityComponentsUnbiased = marginfiAccount.getHealthComponentsWithoutBias(MarginRequirementType.Equity);
  const equityComponentsWithBiasAndWeighted = marginfiAccount.getHealthComponents(MarginRequirementType.Maint);

  let outstandingUxpEmissions = new BigNumber(0);

  const uxpBank = bankInfos.find((bank) => bank.tokenSymbol === "UXD");
  const uxpBalance = marginfiAccount.activeBalances.find((balance) =>
    balance.bankPk.equals(uxpBank?.address ?? PublicKey.default)
  );

  if (uxpBalance) {
    outstandingUxpEmissions = uxpBalance.getTotalOutstandingEmissions(uxpBank!.bank).div(new BigNumber(10).pow(9));
  }

  return {
    balance: equityComponents.assets.minus(equityComponents.liabilities).toNumber(),
    lendingAmount: equityComponents.assets.toNumber(),
    borrowingAmount: equityComponents.liabilities.toNumber(),
    balanceUnbiased: equityComponentsUnbiased.assets.minus(equityComponentsUnbiased.liabilities).toNumber(),
    lendingAmountUnbiased: equityComponentsUnbiased.assets.toNumber(),
    borrowingAmountUnbiased: equityComponentsUnbiased.liabilities.toNumber(),
    lendingAmountWithBiasAndWeighted: equityComponentsWithBiasAndWeighted.assets.toNumber(),
    borrowingAmountWithBiasAndWeighted: equityComponentsWithBiasAndWeighted.liabilities.toNumber(),
    apy: marginfiAccount.computeNetApy(),
    outstandingUxpEmissions: outstandingUxpEmissions.toNumber(),
  };
}

function makeBankInfo(
  bank: Bank,
  tokenMetadata: TokenMetadata,
  priceMap: TokenPriceMap,
  tokenSymbol: string
): BankInfo {
  const { lendingRate, borrowingRate } = bank.getInterestRates();
  const totalPoolDeposits = nativeToUi(bank.totalAssets, bank.mintDecimals);
  const totalPoolBorrows = nativeToUi(bank.totalLiabilities, bank.mintDecimals);
  const liquidity = totalPoolDeposits - totalPoolBorrows;
  const utilizationRate = totalPoolDeposits > 0 ? (totalPoolBorrows / totalPoolDeposits) * 100 : 0;

  let emissionsRate: number = 0;
  let emissions = Emissions.Inactive;

  if (bank.emissionsActiveLending || bank.emissionsActiveBorrowing) {
    const bankTokenData = priceMap[bank.mint.toBase58()];
    const emissionsTokenData = priceMap[bank.emissionsMint.toBase58()];
    const emissionsRateAmount = new BigNumber(nativeToUi(bank.emissionsRate, emissionsTokenData.decimals));
    const emissionsRateValue = emissionsRateAmount.times(emissionsTokenData.price);
    const emissionsRateAdditionalyApy = emissionsRateValue.div(bankTokenData.price);

    emissionsRate = emissionsRateAdditionalyApy.toNumber();

    if (bank.emissionsActiveBorrowing) {
      emissions = Emissions.Borrowing;
    } else if (bank.emissionsActiveLending) {
      emissions = Emissions.Lending;
    }
  }

  return {
    address: bank.publicKey,
    tokenIcon: tokenMetadata.icon,
    tokenSymbol,
    tokenPrice: bank.getPrice(PriceBias.None).toNumber(),
    tokenMint: bank.mint,
    tokenMintDecimals: bank.mintDecimals,
    lendingRate: isNaN(lendingRate.toNumber()) ? 0 : lendingRate.toNumber(),
    borrowingRate: isNaN(borrowingRate.toNumber()) ? 0 : borrowingRate.toNumber(),
    emissionsRate,
    emissions,
    totalPoolDeposits,
    totalPoolBorrows,
    availableLiquidity: liquidity,
    utilizationRate,
    bank,
  };
}

const BIRDEYE_API = "https://public-api.birdeye.so";
async function fetchBirdeyePrice(tokenPubkey: PublicKey): Promise<BigNumber> {
  const response = await fetch(`${BIRDEYE_API}/public/price?address=${tokenPubkey.toBase58()}`, {
    headers: { Accept: "application/json" },
  });

  const responseBody = await response.json();
  if (responseBody.success) {
    return new BigNumber(responseBody.data.value);
  }

  throw new Error("Failed to fetch price");
}

export async function buildEmissionsPriceMap(banks: Bank[], connection: Connection): Promise<TokenPriceMap> {
  const banksWithEmissions = banks.filter((bank) => !bank.emissionsMint.equals(PublicKey.default));

  const emissionsPrices = banksWithEmissions.map(async (bank) => ({
    mint: bank.emissionsMint,
    price: await fetchBirdeyePrice(bank.emissionsMint),
    decimals: (await getMint(connection, bank.emissionsMint)).decimals,
  }));

  const bankPrices = banksWithEmissions.map(async (bank) => ({
    mint: bank.mint,
    price: await fetchBirdeyePrice(bank.mint),
    decimals: bank.mintDecimals,
  }));

  const prices: { mint: PublicKey; price: BigNumber; decimals: number }[] = await Promise.all([
    ...emissionsPrices,
    ...bankPrices,
  ]);

  const tokenMap: TokenPriceMap = {};

  for (let { mint, price, decimals } of prices) {
    tokenMap[mint.toBase58()] = { price, decimals };
  }

  return tokenMap;
}

function makeExtendedBankInfo(
  bankInfo: BankInfo,
  tokenAccount: TokenAccount,
  nativeSolBalance: number,
  marginfiAccount: MarginfiAccount | null
): ExtendedBankInfo {
  const isWrappedSol = bankInfo.tokenMint.equals(WSOL_MINT);
  const positionRaw = marginfiAccount?.activeBalances.find((balance) => balance.bankPk.equals(bankInfo.address));
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
  const weightedUSDValues = balance.getUsdValueWithPriceBias(bankInfo.bank, MarginRequirementType.Maint);
  const isLending = usdValues.liabilities.isZero();
  return {
    amount: isLending
      ? nativeToUi(amounts.assets.toNumber(), bankInfo.tokenMintDecimals)
      : nativeToUi(amounts.liabilities.toNumber(), bankInfo.tokenMintDecimals),
    usdValue: isLending ? usdValues.assets.toNumber() : usdValues.liabilities.toNumber(),
    weightedUSDValue: isLending ? weightedUSDValues.assets.toNumber() : weightedUSDValues.liabilities.toNumber(),
    isLending,
  };
}

export { DEFAULT_ACCOUNT_SUMMARY, computeAccountSummary, makeBankInfo, makeExtendedBankInfo, firebaseApi };
