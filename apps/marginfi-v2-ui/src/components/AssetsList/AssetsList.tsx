import React, { FC, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, TableContainer, Table, TableBody } from "@mui/material";
import { useBorrowLendState } from "../../context/BorrowLendContext";
import { BorrowLendToggle } from "./BorrowLendToggle";
import AssetRow from "./AssetRow";

const AssetsList: FC = () => {
  const [isInLendingMode, setIsInLendingMode] = useState(true);
  const { banks, selectedAccount, reloadUserData, mfiClient } =
    useBorrowLendState();
  const wallet = useWallet();

  if (banks.length === 0) return null;

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
                  {banks.map((bank) => (
                    <AssetRow
                      key={bank.publicKey.toBase58()}
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
