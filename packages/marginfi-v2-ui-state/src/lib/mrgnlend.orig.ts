import {
  Balance,
  Bank,
  BankConfig,
  BankRaw,
  buildFeedIdMap,
  findOracleKey,
  getPriceWithConfidence,
  MarginfiAccount,
  MarginfiAccountWrapper,
  MarginfiGroup,
  MarginfiProgram,
  MarginRequirementType,
  MintData,
  OraclePrice,
  parseOracleSetup,
  parsePriceInfo,
  PriceBias,
  PythPushFeedIdMap,
  RiskTier,
} from "@mrgnlabs/marginfi-client-v2";
import {
  MintLayout,
  getAssociatedTokenAddressSync,
  nativeToUi,
  uiToNative,
  unpackAccount,
  floor,
  ceil,
  WSOL_MINT,
  TokenMetadata,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  BankMetadataMap,
  chunkedGetRawMultipleAccountInfoOrdered,
} from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { Commitment, Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";

const FEE_MARGIN = 0.01;
const VOLATILITY_FACTOR = 0.975;

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

function computeAccountSummary(marginfiAccount: MarginfiAccountWrapper, banks: ExtendedBankInfo[]): AccountSummary {
  const equityComponents = marginfiAccount.computeHealthComponents(MarginRequirementType.Equity);
  const equityComponentsWithoutBias = marginfiAccount.computeHealthComponentsWithoutBias(MarginRequirementType.Equity);
  const maintenanceComponentsWithBiasAndWeighted = marginfiAccount.computeHealthComponents(
    MarginRequirementType.Maintenance
  );

  const signedFreeCollateral = marginfiAccount.computeFreeCollateral({ clamped: false });

  let outstandingUxpEmissions = new BigNumber(0);
  const uxpBank = banks.find((bank) => bank.meta.tokenSymbol === "UXD");
  const uxpBalance = marginfiAccount.activeBalances.find((balance) =>
    balance.bankPk.equals(uxpBank?.address ?? PublicKey.default)
  );
  if (uxpBank && uxpBalance) {
    outstandingUxpEmissions = uxpBalance
      .computeTotalOutstandingEmissions(uxpBank.info.rawBank)
      .div(new BigNumber(10).pow(9));
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

function makeBankInfo(bank: Bank, oraclePrice: OraclePrice, emissionTokenData?: TokenPrice): BankState {
  const { lendingRate, borrowingRate } = bank.computeInterestRates();
  const totalDeposits = nativeToUi(bank.getTotalAssetQuantity(), bank.mintDecimals);
  const totalBorrows = nativeToUi(bank.getTotalLiabilityQuantity(), bank.mintDecimals);
  const liquidity = totalDeposits - totalBorrows;
  const utilizationRate = bank.computeUtilizationRate().times(100).toNumber();

  let emissionsRate: number = 0;
  let emissions = Emissions.Inactive;

  if ((bank.emissionsActiveLending || bank.emissionsActiveBorrowing) && emissionTokenData) {
    const emissionsRateAmount = new BigNumber(nativeToUi(bank.emissionsRate, emissionTokenData.decimals));

    emissionsRate = emissionsRateAmount.toNumber();

    if (bank.emissionsActiveBorrowing) {
      emissions = Emissions.Borrowing;
    } else if (bank.emissionsActiveLending) {
      emissions = Emissions.Lending;
    }
  }

  return {
    price: bank.getPrice(oraclePrice, PriceBias.None).toNumber(),
    mint: bank.mint,
    mintDecimals: bank.mintDecimals,
    lendingRate: isNaN(lendingRate.toNumber()) ? 0 : lendingRate.toNumber(),
    borrowingRate: isNaN(borrowingRate.toNumber()) ? 0 : borrowingRate.toNumber(),
    emissionsRate,
    emissions,
    totalDeposits,
    depositCap: nativeToUi(bank.config.depositLimit, bank.mintDecimals),
    totalBorrows,
    borrowCap: nativeToUi(bank.config.borrowLimit, bank.mintDecimals),
    availableLiquidity: liquidity,
    utilizationRate,
    isIsolated: bank.config.riskTier === RiskTier.Isolated,
  };
}

export async function fetchBirdeyePrices(mints: PublicKey[], apiKey?: string): Promise<BigNumber[]> {
  const mintList = mints.map((mint) => mint.toBase58()).join(",");

  const response = await fetch(`/api/tokens/multi?mintList=${mintList}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
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

export async function makeExtendedBankEmission(
  banks: ExtendedBankInfo[],
  extendedBankMetadatas: ExtendedBankMetadata[],
  tokenMap: TokenPriceMap,
  apiKey?: string
): Promise<[ExtendedBankInfo[], ExtendedBankMetadata[], TokenPriceMap | null]> {
  const emissionsMints = Object.keys(tokenMap).map((key) => new PublicKey(key));
  let birdeyePrices: null | BigNumber[] = emissionsMints.map(() => new BigNumber(0));

  try {
    birdeyePrices = await fetchBirdeyePrices(emissionsMints, apiKey);
  } catch (err) {
    console.log("Failed to fetch emissions prices from Birdeye", err);
    birdeyePrices = null;
  }

  emissionsMints.map((mint, idx) => {
    tokenMap[mint.toBase58()] = {
      ...tokenMap[mint.toBase58()],
      price: birdeyePrices ? birdeyePrices[idx] : new BigNumber(0),
    };
  });

  const updatedBanks = banks.map((bank) => {
    const rawBank = bank.info.rawBank;
    const emissionTokenData = tokenMap[rawBank.emissionsMint.toBase58()];
    let emissionsRate: number = 0;
    let emissions = Emissions.Inactive;
    if ((rawBank.emissionsActiveLending || rawBank.emissionsActiveBorrowing) && emissionTokenData) {
      const emissionsRateAmount = new BigNumber(nativeToUi(rawBank.emissionsRate, emissionTokenData.decimals));
      emissionsRate = emissionsRateAmount.toNumber();

      if (rawBank.emissionsActiveBorrowing) {
        emissions = Emissions.Borrowing;
      } else if (rawBank.emissionsActiveLending) {
        emissions = Emissions.Lending;
      }

      bank.info.state = {
        ...bank.info.state,
        emissionsRate,
        emissions,
      };
    }
    return bank;
  });

  const sortedExtendedBankInfos = updatedBanks.sort(
    (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
  );

  const sortedExtendedBankMetadatas = extendedBankMetadatas.sort((am, bm) => {
    const a = sortedExtendedBankInfos.find((a) => a.address.equals(am.address))!;
    const b = sortedExtendedBankInfos.find((b) => b.address.equals(bm.address))!;
    return b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price;
  });

  return [sortedExtendedBankInfos, sortedExtendedBankMetadatas, birdeyePrices ? tokenMap : null];
}

export async function makeEmissionsPriceMap(
  banks: Bank[],
  connection: Connection,
  emissionTokenMap: TokenPriceMap | null
): Promise<TokenPriceMap> {
  const banksWithEmissions = banks.filter((bank) => !bank.emissionsMint.equals(PublicKey.default));
  const emissionsMints = banksWithEmissions.map((bank) => bank.emissionsMint);

  const mintAis = await connection.getMultipleAccountsInfo(emissionsMints);

  const mint = mintAis.map((ai) => MintLayout.decode(ai!.data));
  const emissionsPrices = banksWithEmissions.map((bank, i) => ({
    mint: bank.emissionsMint,
    price: emissionTokenMap
      ? emissionTokenMap[bank.emissionsMint.toBase58()]?.price ?? new BigNumber(0)
      : new BigNumber(0),
    decimals: mint[0].decimals,
  }));

  const tokenMap: TokenPriceMap = {};
  for (let { mint, price, decimals } of emissionsPrices) {
    tokenMap[mint.toBase58()] = { price, decimals };
  }

  return tokenMap;
}

function makeExtendedBankMetadata(
  bank: Bank,
  tokenMetadata: TokenMetadata,
  overrideIcon?: boolean
): ExtendedBankMetadata {
  return {
    address: bank.address,
    tokenSymbol: tokenMetadata.symbol,
    tokenName: tokenMetadata.name,
    tokenLogoUri: overrideIcon
      ? tokenMetadata.icon ?? "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${bank.mint.toBase58()}.png"
      : `https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${bank.mint.toBase58()}.png`,
  };
}

export type UserDataProps = UserDataWrappedProps | UserDataRawProps;

type UserDataWrappedProps = {
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccountWrapper | null;
  tokenAccount: TokenAccount;
};

type UserDataRawProps = {
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccount | null;
  tokenAccount: TokenAccount;
  banks: Map<string, Bank>;
  oraclePrices: Map<string, OraclePrice>;
};

function makeExtendedBankInfo(
  tokenMetadata: TokenMetadata,
  bank: Bank,
  oraclePrice: OraclePrice,
  emissionTokenPrice?: TokenPrice,
  userData?: UserDataProps,
  overrideIcon?: boolean
): ExtendedBankInfo {
  function isUserDataRawProps(userData: UserDataWrappedProps | UserDataRawProps): userData is UserDataRawProps {
    return (
      (userData as UserDataRawProps).banks !== undefined && (userData as UserDataRawProps).oraclePrices !== undefined
    );
  }

  // Aggregate user-agnostic bank info
  const meta = makeExtendedBankMetadata(bank, tokenMetadata, overrideIcon);
  const bankInfo = makeBankInfo(bank, oraclePrice, emissionTokenPrice);
  let state: BankInfo = {
    rawBank: bank,
    oraclePrice,
    state: bankInfo,
  };

  if (!userData) {
    const userInfo = {
      tokenAccount: {
        created: false,
        mint: bank.mint,
        balance: 0,
      },
      maxDeposit: 0,
      maxRepay: 0,
      maxWithdraw: 0,
      maxBorrow: 0,
    };
    return {
      address: bank.address,
      meta,
      info: state,
      userInfo,
      isActive: false,
    };
  }

  // Calculate user-specific info relevant regardless of whether they have an active position in this bank
  const isWrappedSol = bankInfo.mint.equals(WSOL_MINT);

  const walletBalance = floor(
    isWrappedSol
      ? Math.max(userData.tokenAccount.balance + userData.nativeSolBalance - FEE_MARGIN, 0)
      : userData.tokenAccount.balance,
    bankInfo.mintDecimals
  );

  const { depositCapacity: depositCapacityBN, borrowCapacity: borrowCapacityBN } = bank.computeRemainingCapacity();
  const depositCapacity = nativeToUi(depositCapacityBN, bankInfo.mintDecimals);
  const borrowCapacity = nativeToUi(borrowCapacityBN, bankInfo.mintDecimals);

  let maxDeposit = floor(Math.max(0, Math.min(walletBalance, depositCapacity)), bankInfo.mintDecimals);

  let maxBorrow = 0;
  if (userData.marginfiAccount) {
    let borrowPower: number;
    if (isUserDataRawProps(userData)) {
      borrowPower = userData.marginfiAccount
        .computeMaxBorrowForBank(userData.banks, userData.oraclePrices, bank.address, {
          volatilityFactor: VOLATILITY_FACTOR,
        })
        .toNumber();
    } else {
      borrowPower = userData.marginfiAccount
        .computeMaxBorrowForBank(bank.address, { volatilityFactor: VOLATILITY_FACTOR })
        .toNumber();
    }

    maxBorrow = floor(
      Math.max(0, Math.min(borrowPower, borrowCapacity, bankInfo.availableLiquidity)),
      bankInfo.mintDecimals
    );
  }

  const positionRaw =
    userData.marginfiAccount &&
    userData.marginfiAccount.activeBalances.find((balance) => balance.bankPk.equals(bank.address));
  if (!userData.marginfiAccount || !positionRaw) {
    const userInfo = {
      tokenAccount: userData.tokenAccount,
      maxDeposit,
      maxRepay: 0,
      maxWithdraw: 0,
      maxBorrow,
    };

    return {
      address: bank.address,
      meta,
      info: state,
      userInfo,
      isActive: false,
    };
  }

  // Calculate user-specific info relevant to their active position in this bank

  // const marginfiAccount = userData.marginfiAccount as MarginfiAccountWrapper;

  let props:
    | Pick<MakeLendingPositionRawProps, "marginfiAccount" | "banks" | "oraclePrices">
    | Pick<MakeLendingPositionWrappedProps, "marginfiAccount">;

  if (isUserDataRawProps(userData)) {
    props = {
      marginfiAccount: userData.marginfiAccount,
      banks: userData.banks,
      oraclePrices: userData.oraclePrices,
    };
  } else {
    props = {
      marginfiAccount: userData.marginfiAccount,
    };
  }

  const position = makeLendingPosition({ balance: positionRaw, bank, bankInfo, oraclePrice, ...props });

  let withdrawPower: number;
  if (isUserDataRawProps(userData)) {
    withdrawPower = userData.marginfiAccount
      .computeMaxWithdrawForBank(userData.banks, userData.oraclePrices, bank.address, {
        volatilityFactor: VOLATILITY_FACTOR,
      })
      .toNumber();
  } else {
    withdrawPower = userData.marginfiAccount
      .computeMaxWithdrawForBank(bank.address, {
        volatilityFactor: VOLATILITY_FACTOR,
      })
      .toNumber();
  }

  const maxWithdraw = floor(Math.min(withdrawPower, bankInfo.availableLiquidity), bankInfo.mintDecimals);

  let maxRepay = 0;
  if (position) {
    const debtAmount = ceil(position.amount, bankInfo.mintDecimals);
    maxRepay = Math.min(debtAmount, walletBalance);
  }

  const userInfo = {
    tokenAccount: userData.tokenAccount,
    maxDeposit,
    maxRepay,
    maxWithdraw,
    maxBorrow,
  };

  return {
    address: bank.address,
    meta,
    info: state,
    userInfo,
    isActive: true,
    position,
  };
}

type MakeLendingPositionProps = MakeLendingPositionWrappedProps | MakeLendingPositionRawProps;

interface MakeLendingPositionWrappedProps {
  balance: Balance;
  bank: Bank;
  bankInfo: BankState;
  oraclePrice: OraclePrice;
  marginfiAccount: MarginfiAccountWrapper;
}

interface MakeLendingPositionRawProps {
  balance: Balance;
  bank: Bank;
  bankInfo: BankState;
  oraclePrice: OraclePrice;
  marginfiAccount: MarginfiAccount;
  banks: Map<string, Bank>;
  oraclePrices: Map<string, OraclePrice>;
}

export function makeLendingPosition(props: MakeLendingPositionProps): LendingPosition {
  const { balance, bank, bankInfo, oraclePrice, marginfiAccount } = props;
  const amounts = balance.computeQuantity(bank);
  const usdValues = balance.computeUsdValue(bank, oraclePrice, MarginRequirementType.Equity);
  const weightedUSDValues = balance.getUsdValueWithPriceBias(bank, oraclePrice, MarginRequirementType.Maintenance);

  // default to checking against usdValues to account for active positions with zero asset / liab shares
  // if token has been sunset and oracle set to 0 check against shares instead
  const isLending = oraclePrice.priceRealtime.price.isZero()
    ? balance.assetShares.gt(balance.liabilityShares)
    : usdValues.liabilities.isZero();

  const amount = isLending
    ? nativeToUi(amounts.assets.integerValue(BigNumber.ROUND_DOWN).toNumber(), bankInfo.mintDecimals)
    : nativeToUi(amounts.liabilities.integerValue(BigNumber.ROUND_UP).toNumber(), bankInfo.mintDecimals);
  const isDust = uiToNative(amount, bankInfo.mintDecimals).isZero();
  const weightedUSDValue = isLending ? weightedUSDValues.assets.toNumber() : weightedUSDValues.liabilities.toNumber();
  const usdValue = isLending ? usdValues.assets.toNumber() : usdValues.liabilities.toNumber();
  let liquidationPrice: number | null = null;

  if (marginfiAccount instanceof MarginfiAccountWrapper) {
    liquidationPrice = marginfiAccount.computeLiquidationPriceForBank(bank.address);
  } else if ("banks" in props && "oraclePrices" in props) {
    const banks = props.banks;
    const oraclePrices = props.oraclePrices;
    liquidationPrice = marginfiAccount.computeLiquidationPriceForBank(banks, oraclePrices, bank.address);
  }

  return {
    amount,
    usdValue,
    weightedUSDValue,
    liquidationPrice,
    isLending,
    isDust,
  };
}

async function fetchTokenAccounts(
  connection: Connection,
  walletAddress: PublicKey,
  bankInfos: { mint: PublicKey; mintDecimals: number; bankAddress: PublicKey }[],
  mintDatas: Map<string, MintData>
): Promise<{
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;
}> {
  // Get relevant addresses
  const mintList = bankInfos.map((bank) => ({
    address: bank.mint,
    decimals: bank.mintDecimals,
    bankAddress: bank.bankAddress,
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

  const ataAddresses = mintList.map((mint) => {
    const mintData = mintDatas.get(mint.bankAddress.toBase58());
    if (!mintData) {
      throw new Error(`Failed to find mint data for ${mint.bankAddress.toBase58()}`);
    }
    return getAssociatedTokenAddressSync(mint.address, walletAddress!, true, mintData.tokenProgram);
  }); // We allow off curve addresses here to support Fuse.

  // Fetch relevant accounts
  const accountsAiList = await connection.getMultipleAccountsInfo([walletAddress, ...ataAddresses]);

  // Decode account buffers
  const [walletAi, ...ataAiList] = accountsAiList;
  const nativeSolBalance = walletAi?.lamports ? walletAi.lamports / 1e9 : 0;

  const ataList: TokenAccount[] = ataAiList.map((ai, index) => {
    const mint = mintList[index];

    if (!ai || (!ai?.owner?.equals(TOKEN_PROGRAM_ID) && !ai?.owner?.equals(TOKEN_2022_PROGRAM_ID))) {
      return {
        created: false,
        mint: mint.address,
        balance: 0,
      };
    }

    const mintData = mintDatas.get(mint.bankAddress.toBase58());
    if (!mintData) {
      throw new Error(`Failed to find mint data for ${mint.bankAddress.toBase58()}`);
    }

    const decoded = unpackAccount(ataAddresses[index], ai, mintData.tokenProgram);
    return {
      created: true,
      mint: decoded.mint,
      balance: nativeToUi(new BN(decoded.amount.toString()), mintList[index].decimals),
    };
  });

  return { nativeSolBalance, tokenAccountMap: new Map(ataList.map((ata) => [ata.mint.toString(), ata])) };
}

function getCurrentAction(isLendingMode: boolean, bank: ExtendedBankInfo): ActionType {
  if (!bank.isActive) {
    return isLendingMode ? ActionType.Deposit : ActionType.Borrow;
  } else {
    if (bank.position.isLending) {
      if (isLendingMode) {
        return ActionType.Deposit;
      } else {
        return ActionType.Withdraw;
      }
    } else {
      if (isLendingMode) {
        return ActionType.Repay;
      } else {
        return ActionType.Borrow;
      }
    }
  }
}

async function fetchGroupData(
  program: MarginfiProgram,
  groupAddress: PublicKey,
  commitment?: Commitment,
  bankAddresses?: PublicKey[],
  bankMetadataMap?: BankMetadataMap
): Promise<{
  marginfiGroup: MarginfiGroup;
  banks: Map<string, Bank>;
  priceInfos: Map<string, OraclePrice>;
  tokenDatas: Map<string, MintData>;
  feedIdMap: PythPushFeedIdMap;
}> {
  const debug = require("debug")("mfi:client");
  // Fetch & shape all accounts of Bank type (~ bank discovery)
  let bankDatasKeyed: { address: PublicKey; data: BankRaw }[] = [];
  if (bankAddresses && bankAddresses.length > 0) {
    debug("Using preloaded bank addresses, skipping gpa call", bankAddresses.length, "banks");
    let bankAccountsData = await program.account.bank.fetchMultiple(bankAddresses);
    for (let i = 0; i < bankAccountsData.length; i++) {
      if (bankAccountsData[i] !== null) {
        bankDatasKeyed.push({
          address: bankAddresses[i],
          data: bankAccountsData[i] as any as BankRaw,
        });
      }
    }
  } else {
    let bankAccountsData = await program.account.bank.all([
      { memcmp: { offset: 8 + 32 + 1, bytes: groupAddress.toBase58() } },
    ]);
    bankDatasKeyed = bankAccountsData.map((account: any) => ({
      address: account.publicKey,
      data: account.account as any as BankRaw,
    }));
  }

  async function fetchPythFeedMap() {
    const feedIdMapRaw: Record<string, string> = await fetch(
      `/api/oracle/pythFeedMap?groupPk=${groupAddress.toBase58()}`
    ).then((response) => response.json());
    const feedIdMap: Map<string, PublicKey> = new Map(
      Object.entries(feedIdMapRaw).map(([key, value]) => [key, new PublicKey(value)])
    );
    return feedIdMap;
  }

  async function fetchOraclePrices() {
    const bankDataKeysStr = bankDatasKeyed.map((b) => b.address.toBase58());
    const response = await fetch(`/api/oracle/price?banks=${bankDataKeysStr.join(",")}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch oracle prices");
    }

    const responseBody = await response.json();

    if (!responseBody) {
      throw new Error("Failed to fetch oracle prices");
    }

    const oraclePrices = responseBody.map((oraclePrice: any) => ({
      priceRealtime: {
        price: BigNumber(oraclePrice.priceRealtime.price),
        confidence: BigNumber(oraclePrice.priceRealtime.confidence),
        lowestPrice: BigNumber(oraclePrice.priceRealtime.lowestPrice),
        highestPrice: BigNumber(oraclePrice.priceRealtime.highestPrice),
      },
      priceWeighted: {
        price: BigNumber(oraclePrice.priceWeighted.price),
        confidence: BigNumber(oraclePrice.priceWeighted.confidence),
        lowestPrice: BigNumber(oraclePrice.priceWeighted.lowestPrice),
        highestPrice: BigNumber(oraclePrice.priceWeighted.highestPrice),
      },
      timestamp: oraclePrice.timestamp ? BigNumber(oraclePrice.timestamp) : null,
    })) as OraclePrice[];

    return oraclePrices;
  }

  const [feedIdMap, oraclePrices] = await Promise.all([fetchPythFeedMap(), fetchOraclePrices()]);

  const mintKeys = bankDatasKeyed.map((b) => b.data.mint);
  const emissionMintKeys = bankDatasKeyed
    .map((b) => b.data.emissionsMint)
    .filter((pk) => !pk.equals(PublicKey.default)) as PublicKey[];

  // Batch-fetch the group account and all the oracle accounts as per the banks retrieved above
  const allAis = await chunkedGetRawMultipleAccountInfoOrdered(program.provider.connection, [
    groupAddress.toBase58(),
    ...mintKeys.map((pk) => pk.toBase58()),
    ...emissionMintKeys.map((pk) => pk.toBase58()),
  ]); // NOTE: This will break if/when we start having more than 1 oracle key per bank

  const groupAi = allAis.shift();
  const mintAis = allAis.splice(0, mintKeys.length);
  const emissionMintAis = allAis.splice(0);

  // Unpack raw data for group and oracles, and build the `Bank`s map
  if (!groupAi) throw new Error("Failed to fetch the on-chain group data");
  const marginfiGroup = MarginfiGroup.fromBuffer(groupAddress, groupAi.data, program.idl);

  const banks = new Map(
    bankDatasKeyed.map(({ address, data }) => {
      const bankMetadata = bankMetadataMap ? bankMetadataMap[address.toBase58()] : undefined;
      const bank = Bank.fromAccountParsed(address, data, feedIdMap, bankMetadata);

      return [address.toBase58(), bank];
    })
  );

  const tokenDatas = new Map(
    bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
      const mintAddress = mintKeys[index];
      const mintDataRaw = mintAis[index];
      if (!mintDataRaw) throw new Error(`Failed to fetch mint account for bank ${bankAddress.toBase58()}`);
      let emissionTokenProgram: PublicKey | null = null;
      if (!bankData.emissionsMint.equals(PublicKey.default)) {
        const emissionMintDataRawIndex = emissionMintKeys.findIndex((pk) => pk.equals(bankData.emissionsMint));
        emissionTokenProgram = emissionMintDataRawIndex >= 0 ? emissionMintAis[emissionMintDataRawIndex].owner : null;
      }
      // TODO: parse extension data to see if there is a fee
      return [
        bankAddress.toBase58(),
        { mint: mintAddress, tokenProgram: mintDataRaw.owner, feeBps: 0, emissionTokenProgram },
      ];
    })
  );

  const priceInfos = new Map(
    bankDatasKeyed.map(({ address: bankAddress, data: bankData }, index) => {
      const priceData = oraclePrices[index];
      if (!priceData) throw new Error(`Failed to fetch price oracle account for bank ${bankAddress.toBase58()}`);
      return [bankAddress.toBase58(), priceData as OraclePrice];
    })
  );

  debug("Fetched %s banks and %s price feeds", banks.size, priceInfos.size);

  return {
    marginfiGroup,
    banks,
    priceInfos,
    tokenDatas,
    feedIdMap,
  };
}

export {
  DEFAULT_ACCOUNT_SUMMARY,
  computeAccountSummary,
  makeBankInfo,
  makeExtendedBankMetadata,
  makeExtendedBankInfo,
  fetchTokenAccounts,
  getCurrentAction,
  fetchGroupData,
};

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface AccountSummary {
  healthFactor: number;
  balance: number;
  lendingAmount: number;
  borrowingAmount: number;
  apy: number;
  outstandingUxpEmissions: number;
  balanceUnbiased: number;
  lendingAmountUnbiased: number;
  borrowingAmountUnbiased: number;
  lendingAmountWithBiasAndWeighted: number;
  borrowingAmountWithBiasAndWeighted: number;
  signedFreeCollateral: number;
}

interface TokenPriceMap {
  [key: string]: TokenPrice;
}

interface TokenPrice {
  price: BigNumber;
  decimals: number;
}

interface TokenAccount {
  mint: PublicKey;
  created: boolean;
  balance: number;
}

type TokenAccountMap = Map<string, TokenAccount>;

interface ExtendedBankMetadata {
  address: PublicKey;
  tokenSymbol: string;
  tokenName: string;
  tokenLogoUri: string;
}

interface BankState {
  mint: PublicKey;
  mintDecimals: number;
  price: number;
  lendingRate: number;
  borrowingRate: number;
  emissionsRate: number;
  emissions: Emissions;
  totalDeposits: number;
  depositCap: number;
  totalBorrows: number;
  borrowCap: number;
  availableLiquidity: number;
  utilizationRate: number;
  isIsolated: boolean;
}

interface LendingPosition {
  isLending: boolean;
  amount: number;
  usdValue: number;
  weightedUSDValue: number;
  liquidationPrice: number | null;
  isDust: boolean;
}

interface BankInfo {
  rawBank: Bank;
  oraclePrice: OraclePrice;
  state: BankState;
}

interface UserInfo {
  tokenAccount: TokenAccount;
  maxDeposit: number;
  maxRepay: number;
  maxWithdraw: number;
  maxBorrow: number;
}

interface InactiveBankInfo {
  address: PublicKey;
  meta: ExtendedBankMetadata;
  info: BankInfo;
  isActive: false;
  userInfo: UserInfo;
}

interface ActiveBankInfo {
  address: PublicKey;
  meta: ExtendedBankMetadata;
  info: BankInfo;
  isActive: true;
  userInfo: UserInfo;
  position: LendingPosition;
}

type ExtendedBankInfo = ActiveBankInfo | InactiveBankInfo;

enum Emissions {
  Inactive,
  Lending,
  Borrowing,
}

enum ActionType {
  Deposit = "Supply",
  Borrow = "Borrow",
  Repay = "Repay",
  RepayCollat = "Collateral Repay",
  Withdraw = "Withdraw",
  MintLST = "Mint LST",
  UnstakeLST = "Unstake LST",
  MintYBX = "Mint YBX",
  Loop = "Loop",
}

export { Emissions, ActionType };
export type {
  AccountSummary,
  LendingPosition,
  TokenPriceMap,
  TokenPrice,
  TokenAccount,
  TokenAccountMap,
  ExtendedBankMetadata,
  ActiveBankInfo,
  InactiveBankInfo,
  ExtendedBankInfo,
  BankState,
  BankInfo,
};
