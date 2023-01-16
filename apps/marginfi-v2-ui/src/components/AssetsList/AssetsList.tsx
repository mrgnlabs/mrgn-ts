import React, { FC, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, TableContainer, Table, TableBody } from "@mui/material";
import { useBorrowLendState } from "../../context/BorrowLend";
import { BorrowLendToggle } from "./BorrowLendToggle";
import AssetRow from "./AssetRow";
import { useTokenBalances } from "~/context/TokenAccounts";

const AssetsList: FC = () => {
  const [isInLendingMode, setIsInLendingMode] = useState(true);
  const { banks, selectedAccount, reloadUserData, mfiClient } =
    useBorrowLendState();
  const { tokenBalances } = useTokenBalances();
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
      <div className="col-span-full">
        <BorrowLendToggle
          isInLendingMode={isInLendingMode}
          setIsInLendingMode={setIsInLendingMode}
          disabled={selectedAccount === null}
        />
      </div>

      <div className="col-span-full">
        <Card elevation={0} className="bg-[rgba(0,0,0,0)] w-full">
          <TableContainer>
            <Table className="table-fixed">
              <TableBody>
                <div className="flex flex-col gap-4">
                  {assetInfos.map(({ bank, walletBalance }) => (
                    <AssetRow
                      key={bank.publicKey.toBase58()}
                      walletBalance={walletBalance}
                      isInLendingMode={isInLendingMode}
                      isConnected={wallet.connected}
                      bank={bank}
                      bankMetadata={{
                        icon: "solana_logo.png",
                      }}
                      marginfiAccount={selectedAccount}
                      marginfiClient={mfiClient}
                      reloadUserData={reloadUserData}
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
