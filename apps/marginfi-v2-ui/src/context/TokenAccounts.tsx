import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
import { nativeToUi } from "@mrgnlabs/marginfi-client-v2";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useBorrowLendState } from "./BorrowLend";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { getAssociatedTokenAddressSync, unpackAccount } from "@mrgnlabs/marginfi-client-v2/src/utils/spl";

// @ts-ignore - Safe because context hook checks for null
const TokenBalancesContext = createContext<TokenBalancesState>();

export interface TokenBalance {
  mint: PublicKey;
  created: boolean;
  balance: number;
}

type TokenBalanceMap = Map<string, TokenBalance>;

interface TokenBalancesState {
  fetching: boolean;
  refresh: () => Promise<void>;
  tokenBalances: TokenBalanceMap;
  nativeSol: number;
}

const TokenBalancesProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { banks } = useBorrowLendState();

  const [fetching, setFetching] = useState<boolean>(false);
  const [nativeSol, setNativeSol] = useState<number>(0);
  const [tokenBalances, setTokenBalances] = useState<TokenBalanceMap>(new Map<string, TokenBalance>());

  const fetchTokenBalances = useCallback(async (): Promise<TokenBalanceMap> => {
    if (!wallet.publicKey) {
      return new Map<string, TokenBalance>();
    }

    // Get relevant addresses
    const mintList = banks.map((bank) => ({
      address: bank.mint,
      decimals: bank.mintDecimals,
    }));
    const ataAddresses = mintList.map((mint) => getAssociatedTokenAddressSync(mint.address, wallet.publicKey!));

    // Fetch relevant accounts
    const accountsAiList = await connection.getMultipleAccountsInfo([wallet.publicKey, ...ataAddresses]);

    // Decode account buffers
    const [walletAi, ...ataAiList] = accountsAiList;
    setNativeSol(walletAi?.lamports ? walletAi.lamports / 1e9 : 0);

    const ataList: TokenBalance[] = ataAiList.map((ai, index) => {
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

    return new Map(ataList.map((ata) => [ata.mint.toString(), ata]));
  }, [connection, wallet.publicKey, banks]);

  const refresh = useCallback(async () => {
    setFetching(true);
    try {
      setTokenBalances(await fetchTokenBalances());
    } catch (error: any) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  }, [fetchTokenBalances]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <TokenBalancesContext.Provider value={{ fetching, refresh, tokenBalances, nativeSol }}>
      {children}
    </TokenBalancesContext.Provider>
  );
};

const useTokenBalances = () => {
  const context = useContext(TokenBalancesContext);
  if (!context) {
    throw new Error("useTokenBalances must be used within a TokenBalancesProvider");
  }

  return context;
};

export { useTokenBalances, TokenBalancesProvider };
