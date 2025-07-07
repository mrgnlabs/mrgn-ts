import { OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { NATIVE_MINT, numeralFormatter, TokenMetadata, usdFormatter } from "@mrgnlabs/mrgn-common";
import { useMetadata, useOracleData, useUserBalances, useUserStakeAccounts } from "@mrgnlabs/mrgn-state";
import React from "react";
import { TokenWalletData } from "@mrgnlabs/mrgn-ui";

export function useWalletData(): {
  tokenBalances: TokenWalletData[];
  nativeStakeBalances: TokenWalletData[];
  isLoading: boolean;
} {
  const { data: userBalances, isLoading: isLoadingUserBalances } = useUserBalances();
  const { data: userStakeAccounts, isLoading: isLoadingUserStakeAccounts } = useUserStakeAccounts();
  const { data: metadata, isLoading: isLoadingMetadata } = useMetadata();
  const { data: oracleData } = useOracleData();

  const priceByMint = React.useMemo(() => {
    const bankMetadataMap = metadata?.bankMetadataMap;

    if (!oracleData?.oracleMap || !bankMetadataMap) {
      return {};
    }

    const result: { [key: string]: OraclePrice } = {};

    oracleData.oracleMap.forEach((price, bankAddress) => {
      const bankMetadata = bankMetadataMap[bankAddress];
      if (!bankMetadata) {
        return;
      }
      result[bankMetadata.tokenAddress] = price;
    });

    return result;
  }, [oracleData, metadata]);

  const metadataByMint = React.useMemo(() => {
    if (!metadata?.tokenMetadataMap) {
      return {};
    }

    return Object.entries(metadata.tokenMetadataMap).reduce(
      (acc, [, token]) => {
        acc[token.address] = token;
        return acc;
      },
      {} as { [key: string]: TokenMetadata }
    );
  }, [metadata]);

  const nativeStakeBalances: TokenWalletData[] = React.useMemo(() => {
    if (!metadataByMint || !userStakeAccounts) {
      return [];
    }

    return userStakeAccounts.map((stakeAccount) => {
      const mint = stakeAccount.poolMintKey;
      const metadata = metadataByMint[mint.toBase58()] || {
        symbol: "",
        name: "",
      };

      const price = priceByMint[NATIVE_MINT.toBase58()]?.priceRealtime.price.toNumber() || 0;
      const tokenBalance = stakeAccount.accounts.reduce((acc, account) => acc + account.amount, 0);
      const valueUSD = price * tokenBalance;

      const tokenMetadata = {
        symbol: metadata.symbol,
        name: metadata.name,
        image: `https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${mint.toBase58()}.png`,
        decimals: metadata.decimals,
      };

      const tokenPriceData = {
        value: tokenBalance,
        valueUSD: valueUSD,
        formattedValue: tokenBalance < 0.01 ? `< 0.01` : numeralFormatter(tokenBalance),
        formattedValueUSD: usdFormatter.format(valueUSD),
      };
      return {
        mint,
        ...tokenMetadata,
        ...tokenPriceData,
      };
    });
  }, [metadataByMint, priceByMint, userStakeAccounts]);

  const tokenBalances: TokenWalletData[] = React.useMemo(() => {
    const nativeSolBalance = userBalances?.nativeSolBalance || 0;

    if (!metadataByMint || !userBalances) {
      return [];
    }

    let solFound = false;

    const tokenBalances = userBalances.ataList
      .filter((ata) => ata.created)
      .map((acc) => {
        const mint = acc.mint;

        const isWsol = mint.equals(NATIVE_MINT);

        if (isWsol) solFound = true;

        const metadata = metadataByMint[acc.mint.toBase58()] || {
          symbol: "",
          name: "",
        };
        const price = priceByMint[acc.mint.toBase58()];
        const tokenBalance = isWsol ? nativeSolBalance + acc.balance : acc.balance;

        const usdValue = price ? price.priceRealtime.price.times(tokenBalance).toNumber() : 0;

        const tokenMetadata = {
          symbol: metadata.symbol,
          name: metadata.name,
          image: `https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${mint.toBase58()}.png`,
          decimals: metadata.decimals,
        };

        const tokenPriceData = {
          value: tokenBalance,
          valueUSD: usdValue,
          formattedValue: tokenBalance < 0.01 ? `< 0.01` : numeralFormatter(tokenBalance),
          formattedValueUSD: usdFormatter.format(usdValue),
        };

        return {
          mint,
          ...tokenMetadata,
          ...tokenPriceData,
        };
      })
      .sort((a, b) => b.valueUSD - a.valueUSD);

    if (!solFound) {
      const solPrice = priceByMint[NATIVE_MINT.toBase58()]?.priceRealtime.price.toNumber() || 0;
      tokenBalances.push({
        mint: NATIVE_MINT,
        symbol: "SOL",
        name: "Solana",
        image: `https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${NATIVE_MINT.toBase58()}.png`,
        decimals: 9,
        value: nativeSolBalance,
        valueUSD: nativeSolBalance * (solPrice || 0),
        formattedValue: numeralFormatter(nativeSolBalance),
        formattedValueUSD: usdFormatter.format(nativeSolBalance * (solPrice || 0)),
      });
    }

    return tokenBalances;
  }, [userBalances, priceByMint, metadataByMint]);

  const isLoading = isLoadingUserBalances || isLoadingUserStakeAccounts || isLoadingMetadata;

  return {
    tokenBalances,
    nativeStakeBalances,
    isLoading,
  };
}
