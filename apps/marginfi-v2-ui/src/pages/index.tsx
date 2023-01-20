import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
// We're only breaking out the very top sub-components into their own files 🥺. <- 🫶
import {
  AccountSummary,
  AssetsList,
  UserPositions,
  MultipleAccountsFoundWarning,
} from "~/components";
import { useBorrowLendState } from "~/context/BorrowLend";

const Home = () => {
  const wallet = useWallet();
  const { userAccounts } = useBorrowLendState();

  return (
    <div className="w-full h-full flex flex-col justify-start content-start py-[64px] grid w-4/5 max-w-7xl gap-4 grid-cols-1 xl:grid-cols-2">
      {wallet.connected && userAccounts.length > 1 && (
        <MultipleAccountsFoundWarning />
      )}
      <AccountSummary />
      <AssetsList />
      {wallet.connected && <UserPositions />}
    </div>
  );
};

export default Home;
