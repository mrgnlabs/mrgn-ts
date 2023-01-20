import React, { FC, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, TableContainer, Table, TableBody } from "@mui/material";
import { useBorrowLendState } from "../../context/BorrowLend";
import { BorrowLendToggle } from "./BorrowLendToggle";
import AssetRow from "./AssetRow";
import { useTokenBalances } from "~/context/TokenAccounts";
import { useTokenMetadata } from "~/context/TokenMetadata";

const AssetsList: FC = () => {
  const [isInLendingMode, setIsInLendingMode] = useState(true);
  const { banks, selectedAccount, refreshData, mfiClient } =
    useBorrowLendState();
  const { tokenBalances, nativeSol } = useTokenBalances();
  const { tokenMetadataMap } = useTokenMetadata();
  const wallet = useWallet();

  if (banks.length === 0) return null;

  const assetInfos = banks.map((bank) => {
    return {
      bank,
      walletBalance: tokenBalances.get(bank.mint.toBase58())?.balance || 0,
    };
  });

  return (
    <>
      <div
        className="col-span-full"
      >
        <BorrowLendToggle
          isInLendingMode={isInLendingMode}
          setIsInLendingMode={setIsInLendingMode}
        />
      </div>

      <div className="col-span-full">
        <Card
          elevation={0} 
          className="bg-[rgba(0,0,0,0)] w-full"
        >
          <TableContainer>
            <Table className="table-fixed">
              <TableBody>
                <div className="flex flex-col gap-4">
                  {assetInfos.map(({ bank, walletBalance }) => (
                    <AssetRow
                      key={bank.publicKey.toBase58()}
                      tokenBalance={walletBalance}
                      nativeSol={nativeSol}
                      isInLendingMode={isInLendingMode}
                      isConnected={wallet.connected}
                      bank={bank}
                      tokenMetadata={tokenMetadataMap[bank.label]}
                      marginfiAccount={selectedAccount}
                      marginfiClient={mfiClient}
                      refreshBorrowLendState={refreshData}
                    />
                  ))}
                </div>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </div>
    </>
  );
};

export { AssetsList };
