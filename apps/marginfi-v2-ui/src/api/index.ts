import { Balance, Bank, MarginfiAccount, MarginRequirementType, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import {
  AccountSummary,
  BankInfo,
  Emissions,
  ExtendedBankInfo,
  TokenAccount,
  TokenAccountMap,
  TokenMetadata,
  TokenPrice,
  TokenPriceMap,
  UserPosition,
} from "~/types";
import { WSOL_MINT } from "~/config";
import { floor } from "~/utils";
import { getAssociatedTokenAddressSync, getMint, nativeToUi, unpackAccount } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { Connection, PublicKey } from "@solana/web3.js";
import * as firebaseApi from "./firebase";
import BN from "bn.js";

const VOLATILITY_FACTOR = 0.95;

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
  signedFreeCollateral: 0,
};

function computeAccountSummary(marginfiAccount: MarginfiAccount, bankInfos: BankInfo[]): AccountSummary {
  const equityComponents = marginfiAccount.computeHealthComponents(MarginRequirementType.Equity);
  const equityComponentsUnbiased = marginfiAccount.computeHealthComponentsWithoutBias(MarginRequirementType.Equity);
  const equityComponentsWithBiasAndWeighted = marginfiAccount.computeHealthComponents(MarginRequirementType.Maint);

  let outstandingUxpEmissions = new BigNumber(0);

  const signedFreeCollateral = marginfiAccount.computeFreeCollateral({ clamped: false });

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
    signedFreeCollateral: signedFreeCollateral.toNumber(),
  };
}

function makeBankInfo(
  bank: Bank,
  tokenMetadata: TokenMetadata,
  tokenSymbol: string,
  tokenData: TokenPrice,
  emissionTokenData?: TokenPrice
): BankInfo {
  const { lendingRate, borrowingRate } = bank.getInterestRates();
  const totalPoolDeposits = nativeToUi(bank.totalAssets, bank.mintDecimals);
  const totalPoolBorrows = nativeToUi(bank.totalLiabilities, bank.mintDecimals);
  const liquidity = totalPoolDeposits - totalPoolBorrows;
  const utilizationRate = totalPoolDeposits > 0 ? (totalPoolBorrows / totalPoolDeposits) * 100 : 0;

  let emissionsRate: number = 0;
  let emissions = Emissions.Inactive;

  if ((bank.emissionsActiveLending || bank.emissionsActiveBorrowing) && emissionTokenData) {
    const emissionsRateAmount = new BigNumber(nativeToUi(bank.emissionsRate, emissionTokenData.decimals));
    const emissionsRateValue = emissionsRateAmount.times(emissionTokenData.price);
    const emissionsRateAdditionalyApy = emissionsRateValue.div(tokenData.price);

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
    Math.min(
      marginfiAccount
        ?.computeMaxWithdrawForBank(bankInfo.address, { volatilityFactor: VOLATILITY_FACTOR })
        .toNumber() ?? 0,
      bankInfo.availableLiquidity
    ),
    bankInfo.tokenMintDecimals
  );
  const maxBorrow = floor(
    Math.min(
      (marginfiAccount?.computeMaxBorrowForBank(bankInfo.bank.publicKey).toNumber() ?? 0) * VOLATILITY_FACTOR,
      bankInfo.availableLiquidity
    ),
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

async function fetchTokenAccounts(
  connection: Connection,
  walletAddress: PublicKey,
  bankInfos: BankInfo[]
): Promise<{
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;
}> {
  // Get relevant addresses
  const mintList = bankInfos.map((bank) => ({
    address: bank.tokenMint,
    decimals: bank.tokenMintDecimals,
  }));

  if (walletAddress === null) {
    const emptyTokenAccountMap = new Map(
      mintList.map(({ address }) => [
        address.toBase58(),
        {
          created: false,
          mint: address,
          balance: 0,
        },
      ])
    );

    return {
      nativeSolBalance: 0,
      tokenAccountMap: emptyTokenAccountMap,
    };
  }

  const ataAddresses = mintList.map((mint) => getAssociatedTokenAddressSync(mint.address, walletAddress!));

  // Fetch relevant accounts
  const accountsAiList = await connection.getMultipleAccountsInfo([walletAddress, ...ataAddresses]);

  // Decode account buffers
  const [walletAi, ...ataAiList] = accountsAiList;
  const nativeSolBalance = walletAi?.lamports ? walletAi.lamports / 1e9 : 0;

  const ataList: TokenAccount[] = ataAiList.map((ai, index) => {
    if (!ai) {
      return {
        created: false,
        mint: mintList[index].address,
        balance: 0,
      };
    }
    const decoded = unpackAccount(ataAddresses[index], ai);
    return {
      created: true,
      mint: decoded.mint,
      balance: nativeToUi(new BN(decoded.amount.toString()), mintList[index].decimals),
    };
  });

  return { nativeSolBalance, tokenAccountMap: new Map(ataList.map((ata) => [ata.mint.toString(), ata])) };
}

export { DEFAULT_ACCOUNT_SUMMARY, computeAccountSummary, makeBankInfo, makeExtendedBankInfo, firebaseApi, fetchTokenAccounts };
