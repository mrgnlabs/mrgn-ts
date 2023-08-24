import {
  Balance,
  Bank,
  MarginfiAccountWrapper,
  MarginRequirementType,
  OraclePrice,
  PriceBias,
} from "@mrgnlabs/marginfi-client-v2";
import {
  AccountSummary,
  BankInfo,
  Emissions,
  ExtendedBankInfo,
  TokenAccount,
  TokenAccountMap,
  TokenPrice,
  TokenPriceMap,
  UserPosition,
} from "../types";
import {
  MintLayout,
  getAssociatedTokenAddressSync,
  nativeToUi,
  unpackAccount,
  floor,
  WSOL_MINT,
  TokenMetadata,
} from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { Connection, PublicKey } from "@solana/web3.js";
import * as firebaseApi from "./firebase";
import BN from "bn.js";

const FEE_MARGIN = 0.01;
const VOLATILITY_FACTOR = 0.95;

const DEFAULT_ACCOUNT_SUMMARY = {
  healthFactor: 0,
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

function computeAccountSummary(marginfiAccount: MarginfiAccountWrapper, bankInfos: ExtendedBankInfo[]): AccountSummary {
  const equityComponents = marginfiAccount.computeHealthComponents(MarginRequirementType.Equity);
  const equityComponentsWithoutBias = marginfiAccount.computeHealthComponentsWithoutBias(MarginRequirementType.Equity);
  const maintenanceComponentsWithBiasAndWeighted = marginfiAccount.computeHealthComponents(
    MarginRequirementType.Maintenance
  );

  let outstandingUxpEmissions = new BigNumber(0);

  const signedFreeCollateral = marginfiAccount.computeFreeCollateral({ clamped: false });

  const uxpBank = bankInfos.find((bank) => bank.tokenSymbol === "UXD");
  const uxpBalance = marginfiAccount.activeBalances.find((balance) =>
    balance.bankPk.equals(uxpBank?.address ?? PublicKey.default)
  );

  if (uxpBalance) {
    outstandingUxpEmissions = uxpBalance.computeTotalOutstandingEmissions(uxpBank!.bank).div(new BigNumber(10).pow(9));
  }

  const healthFactor = maintenanceComponentsWithBiasAndWeighted.assets.isZero()
    ? 1
    : maintenanceComponentsWithBiasAndWeighted.assets
        .minus(maintenanceComponentsWithBiasAndWeighted.liabilities)
        .dividedBy(maintenanceComponentsWithBiasAndWeighted.assets)
        .toNumber();

  return {
    healthFactor,
    balance: equityComponents.assets.minus(equityComponents.liabilities).toNumber(),
    lendingAmount: equityComponents.assets.toNumber(),
    borrowingAmount: equityComponents.liabilities.toNumber(),
    balanceUnbiased: equityComponentsWithoutBias.assets.minus(equityComponentsWithoutBias.liabilities).toNumber(),
    lendingAmountUnbiased: equityComponentsWithoutBias.assets.toNumber(),
    borrowingAmountUnbiased: equityComponentsWithoutBias.liabilities.toNumber(),
    lendingAmountWithBiasAndWeighted: maintenanceComponentsWithBiasAndWeighted.assets.toNumber(),
    borrowingAmountWithBiasAndWeighted: maintenanceComponentsWithBiasAndWeighted.liabilities.toNumber(),
    apy: marginfiAccount.computeNetApy(),
    outstandingUxpEmissions: outstandingUxpEmissions.toNumber(),
    signedFreeCollateral: signedFreeCollateral.toNumber(),
  };
}

function makeBankInfo(
  bank: Bank,
  oraclePrice: OraclePrice,
  tokenMetadata: TokenMetadata,
  tokenSymbol: string,
  emissionTokenData?: TokenPrice
): BankInfo {
  const { lendingRate, borrowingRate } = bank.computeInterestRates();
  const totalPoolDeposits = nativeToUi(bank.getTotalAssetQuantity(), bank.mintDecimals);
  const totalPoolBorrows = nativeToUi(bank.getTotalLiabilityQuantity(), bank.mintDecimals);
  const liquidity = totalPoolDeposits - totalPoolBorrows;
  const utilizationRate = totalPoolDeposits > 0 ? (totalPoolBorrows / totalPoolDeposits) * 100 : 0;

  let emissionsRate: number = 0;
  let emissions = Emissions.Inactive;

  if ((bank.emissionsActiveLending || bank.emissionsActiveBorrowing) && emissionTokenData) {
    const emissionsRateAmount = new BigNumber(nativeToUi(bank.emissionsRate, emissionTokenData.decimals));
    const emissionsRateValue = emissionsRateAmount.times(emissionTokenData.price);
    const emissionsRateAdditionalyApy = emissionsRateValue.div(oraclePrice.price);

    emissionsRate = emissionsRateAdditionalyApy.toNumber();

    if (bank.emissionsActiveBorrowing) {
      emissions = Emissions.Borrowing;
    } else if (bank.emissionsActiveLending) {
      emissions = Emissions.Lending;
    }
  }

  return {
    bank,
    oraclePrice,

    address: bank.address,
    tokenIcon: tokenMetadata.icon,
    tokenSymbol,
    tokenPrice: bank.getPrice(oraclePrice, PriceBias.None).toNumber(),
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
  };
}

const BIRDEYE_API = "https://public-api.birdeye.so";
async function fetchBirdeyePrices(mints: PublicKey[]): Promise<BigNumber[]> {
  const mintList = mints.map((mint) => mint.toBase58()).join(",");
  const response = await fetch(`${BIRDEYE_API}/public/multi_price?list_address=${mintList}`, {
    headers: { Accept: "application/json" },
  });

  const responseBody = await response.json();
  if (responseBody.success) {
    const prices = new Map(
      Object.entries(responseBody.data).map(([mint, priceData]: [string, any]) => [mint, BigNumber(priceData.value)])
    );

    return mints.map((mint) => {
      const price = prices.get(mint.toBase58());
      if (!price) throw new Error(`Failed to fetch price for ${mint.toBase58()}`);
      return price;
    });
  }

  throw new Error("Failed to fetch price");
}

export async function fetchEmissionsPriceMap(banks: Bank[], connection: Connection): Promise<TokenPriceMap> {
  const banksWithEmissions = banks.filter((bank) => !bank.emissionsMint.equals(PublicKey.default));
  const emissionsMints = banksWithEmissions.map((bank) => bank.emissionsMint);

  const [birdeyePrices, mintAis] = await Promise.all([
    fetchBirdeyePrices(emissionsMints),
    connection.getMultipleAccountsInfo(emissionsMints),
  ]);
  const mint = mintAis.map((ai) => MintLayout.decode(ai!.data));
  const emissionsPrices = banksWithEmissions.map((bank, i) => ({
    mint: bank.emissionsMint,
    price: birdeyePrices[i],
    decimals: mint[0].decimals,
  }));

  const tokenMap: TokenPriceMap = {};
  for (let { mint, price, decimals } of emissionsPrices) {
    tokenMap[mint.toBase58()] = { price, decimals };
  }

  return tokenMap;
}

function makeExtendedBankInfo(
  bank: Bank,
  oraclePrice: OraclePrice,
  tokenMetadata: TokenMetadata,
  tokenSymbol: string,
  emissionTokenPrice?: TokenPrice,
  userData?: {
    nativeSolBalance: number;
    marginfiAccount: MarginfiAccountWrapper;
    tokenAccount: TokenAccount;
  }
): ExtendedBankInfo {
  // Aggregate user-agnostic bank info
  const bankInfo = makeBankInfo(bank, oraclePrice, tokenMetadata, tokenSymbol, emissionTokenPrice);

  if (!userData) {
    return {
      ...bankInfo,
      ...{
        hasActivePosition: false,
        tokenAccount: { mint: bankInfo.tokenMint, created: false, balance: 0 },
        maxDeposit: 0,
        maxRepay: 0,
        maxWithdraw: 0,
        maxBorrow: 0,
      },
    };
  }

  // Calculate user-specific info relevant regardless of whether they have an active position in this bank
  const isWrappedSol = bankInfo.tokenMint.equals(WSOL_MINT);

  const maxDeposit = floor(
    isWrappedSol
      ? Math.max(userData.tokenAccount.balance + userData.nativeSolBalance - FEE_MARGIN, 0)
      : userData.tokenAccount.balance,
    bankInfo.tokenMintDecimals
  );
  const maxBorrow = floor(
    Math.min(
      userData.marginfiAccount.computeMaxBorrowForBank(bankInfo.bank.address).toNumber() * VOLATILITY_FACTOR,
      bankInfo.availableLiquidity
    ),
    bankInfo.tokenMintDecimals
  );

  const positionRaw = userData.marginfiAccount.activeBalances.find((balance) =>
    balance.bankPk.equals(bankInfo.address)
  );
  if (!positionRaw) {
    return {
      ...bankInfo,
      ...{
        hasActivePosition: false,
        tokenAccount: userData.tokenAccount,
        maxDeposit,
        maxRepay: 0,
        maxWithdraw: 0,
        maxBorrow,
      },
    };
  }

  // Calculate user-specific info relevant to their active position in this bank
  const position = makeUserPosition(positionRaw, bankInfo, oraclePrice);

  const maxWithdraw = floor(
    Math.min(
      userData.marginfiAccount
        .computeMaxWithdrawForBank(bankInfo.address, { volatilityFactor: VOLATILITY_FACTOR })
        .toNumber(),
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

  return {
    ...bankInfo,
    ...{
      hasActivePosition: true,
      tokenAccount: userData.tokenAccount,
      maxDeposit,
      maxRepay,
      maxWithdraw,
      maxBorrow,
      position,
    },
  };
}

function makeUserPosition(balance: Balance, bankInfo: BankInfo, oraclePrice: OraclePrice): UserPosition {
  const amounts = balance.computeQuantity(bankInfo.bank);
  const usdValues = balance.computeUsdValue(bankInfo.bank, oraclePrice, MarginRequirementType.Equity);
  const weightedUSDValues = balance.getUsdValueWithPriceBias(
    bankInfo.bank,
    oraclePrice,
    MarginRequirementType.Maintenance
  );
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
  bankInfos: { mint: PublicKey; mintDecimals: number }[]
): Promise<{
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;
}> {
  // Get relevant addresses
  const mintList = bankInfos.map((bank) => ({
    address: bank.mint,
    decimals: bank.mintDecimals,
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

export {
  DEFAULT_ACCOUNT_SUMMARY,
  computeAccountSummary,
  makeBankInfo,
  makeExtendedBankInfo,
  firebaseApi,
  fetchTokenAccounts,
};
