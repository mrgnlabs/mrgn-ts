import { BN } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { MarginfiAccountWrapper, MarginRequirementType, MintData } from "@mrgnlabs/marginfi-client-v2";

import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, unpackAccount, nativeToUi } from "@mrgnlabs/mrgn-common";

import { ExtendedBankInfo, AccountSummary, TokenAccountMap, TokenAccount } from "../types";
import { getStakeAccountsCached } from "./staked-collateral.utils";

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

async function fetchTokenAccounts(
  connection: Connection,
  walletAddress: PublicKey,
  bankInfos: { mint: PublicKey; mintDecimals: number; bankAddress: PublicKey; assetTag?: number }[],
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
    assetTag: bank.assetTag,
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

  // get users native stake accounts
  const stakeAccounts = await getStakeAccountsCached(walletAddress);

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

    // check if user has native stake account for this validator lst
    // if so, return the sum of the native stake
    const stakeAccount = stakeAccounts.find((stakeAccount) => stakeAccount.poolMintKey.equals(mint.address));
    if (stakeAccount) {
      return {
        created: true,
        mint: mint.address,
        balance: stakeAccount.largestAccount.amount,
      };
    }

    // if user has no stake account for this validator, return 0
    if (mint.assetTag === 2 && !stakeAccount) {
      return {
        created: false,
        mint: mint.address,
        balance: 0,
      };
    }

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

async function fetchBirdeyePrices(mints: PublicKey[], apiKey?: string): Promise<BigNumber[]> {
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

// staked

export { fetchBirdeyePrices, fetchTokenAccounts, computeAccountSummary };
