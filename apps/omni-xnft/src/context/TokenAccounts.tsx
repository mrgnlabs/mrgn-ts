import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
import BN from "bn.js";
import { useBanks, useXnftProvider } from "~/context";
import { TokenAccount, TokenAccountMap } from "~/types";
import { getAssociatedTokenAddressSync, nativeToUi, unpackAccount } from "@mrgnlabs/mrgn-common";

// @ts-ignore - Safe because context hook checks for null
const TokenAccountsContext = createContext<TokenAccountsState>();

interface TokenAccountsState {
  fetching: boolean;
  reload: () => Promise<void>;
  fetchTokenAccounts: () => Promise<{ nativeSolBalance: number; tokenAccountMap: TokenAccountMap }>;
  tokenAccountMap: TokenAccountMap;
  nativeSol: number;
}

const TokenAccountsProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { wallet, connection } = useXnftProvider();
  const { banks } = useBanks();

  const [fetching, setFetching] = useState<boolean>(false);
  const [nativeSol, setNativeSol] = useState<number>(0);
  const [tokenAccountMap, setTokenAccountMap] = useState<TokenAccountMap>(new Map<string, TokenAccount>());

  const fetchTokenAccounts = useCallback(async (): Promise<{
    nativeSolBalance: number;
    tokenAccountMap: TokenAccountMap;
  }> => {
    // Get relevant addresses
    const mintList = banks.map((bank) => ({
      address: bank.mint,
      decimals: bank.mintDecimals,
    }));

    if (!wallet?.publicKey || !connection) {
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

    const ataAddresses = mintList.map((mint) => getAssociatedTokenAddressSync(mint.address, wallet.publicKey!));

    // Fetch relevant accounts
    const accountsAiList = await connection.getMultipleAccountsInfo([wallet.publicKey, ...ataAddresses]);

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
  }, [banks, wallet, connection]);

  const reload = useCallback(async () => {
    setFetching(true);
    try {
      const { nativeSolBalance, tokenAccountMap } = await fetchTokenAccounts();
      setNativeSol(nativeSolBalance);
      setTokenAccountMap(tokenAccountMap);
    } catch (error: any) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  }, [fetchTokenAccounts]);

  useEffect(() => {
    reload();
    const id = setInterval(reload, 10_000);
    return () => clearInterval(id);
  }, [reload]);

  return (
    <TokenAccountsContext.Provider
      value={{ fetching, fetchTokenAccounts, reload, tokenAccountMap: tokenAccountMap, nativeSol }}
    >
      {children}
    </TokenAccountsContext.Provider>
  );
};

const useTokenAccounts = () => {
  const context = useContext(TokenAccountsContext);
  if (!context) {
    throw new Error("useTokenAccounts must be used within a TokenAccountsProvider");
  }

  return context;
};

export { useTokenAccounts, TokenAccountsProvider };
