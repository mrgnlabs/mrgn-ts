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
    <div
      className="min-h-screen w-full flex justify-center fixed top-[56px] xl:top-0"
    >
      <div
        className="grid w-[85%] xl:w-4/5 max-w-7xl p-0 self-center gap-4 grid-cols-1 xl:grid-cols-2"
        style={{
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
          overflowX: "hidden",
          overflowY: "scroll",
        }}
      >
        {wallet.connected && userAccounts.length > 1 && (
          <MultipleAccountsFoundWarning />
        )}
        <AccountSummary />
        <AssetsList />
        {wallet.connected && <UserPositions />}
      </div>
    </div>
  );
};

export default Home;
