import React from "react";
import { nativeToUi } from "@mrgnlabs/marginfi-client-v2";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  FC,
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { getAssociatedTokenAddressSync, unpackAccount } from "~/utils/spl";
import { useBorrowLendState } from "./BorrowLendContext";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

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
}

const TokenBalancesProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { banks } = useBorrowLendState();

  const [fetching, setFetching] = useState<boolean>(false);
  const [tokenBalances, setTokenBalances] = useState<TokenBalanceMap>(
    new Map<string, TokenBalance>()
  );

  const fetchTokenBalances = useCallback(async (): Promise<TokenBalanceMap> => {
    if (!wallet.publicKey) {
      return new Map<string, TokenBalance>();
    }

    // Get relevant addresses
    const mintList = banks.map((bank) => ({
      address: bank.mint,
      decimals: bank.mintDecimals,
    }));
    const ataAddresses = mintList.map((mint) =>
      getAssociatedTokenAddressSync(mint.address, wallet.publicKey!)
    );

    // Fetch relevant accounts
    const ataAiList = await connection.getMultipleAccountsInfo(ataAddresses);

    // Decode account buffers
    const ataList: TokenBalance[] = ataAiList.map((ai, index) => {
      const decoded = unpackAccount(ataAddresses[index], ai);
      return {
        created: !!ai,
        mint: decoded.mint,
        balance: !ai
          ? 0
          : nativeToUi(
              new BN(decoded.amount.toString()),
              mintList[index].decimals
            ),
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
    <TokenBalancesContext.Provider value={{ fetching, refresh, tokenBalances }}>
      {children}
    </TokenBalancesContext.Provider>
  );
};

const useTokenBalances = () => {
  const context = useContext(TokenBalancesContext);
  if (!context) {
    throw new Error(
      "useTokenBalances must be used within a TokenBalancesProvider"
    );
  }

  return context;
};

export { useTokenBalances, TokenBalancesProvider };
