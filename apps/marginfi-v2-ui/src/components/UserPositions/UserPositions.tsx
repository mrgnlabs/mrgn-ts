import React, { FC, useMemo } from "react";
import { Card, Table, TableBody, TableContainer } from "@mui/material";
import { useBorrowLendState, useTokenBalances } from "~/context";
import UserPositionRow from "./UserPositionRow";

const UserPositions: FC = () => {
  const { accountSummary, selectedAccount, refreshData } = useBorrowLendState();
  const { lendPositions, borrowPositions } = useMemo(
    () => ({
      lendPositions: accountSummary.positions.filter((p) => p.isLending),
      borrowPositions: accountSummary.positions.filter((p) => !p.isLending),
    }),
    [accountSummary]
  );

  const { tokenBalances, nativeSol } = useTokenBalances();

  const { lentAssetInfos, borrowedAssetInfos } = useMemo(
    () => ({
      lentAssetInfos: lendPositions.map((position) => ({
        position,
        walletBalance: tokenBalances.get(position.bank.mint.toBase58())?.balance || 0,
      })),
      borrowedAssetInfos: borrowPositions.map((position) => ({
        position,
        walletBalance: tokenBalances.get(position.bank.mint.toBase58())?.balance || 0,
      })),
    }),
    [lendPositions, borrowPositions, tokenBalances]
  );

  return (
    <>
      {lentAssetInfos.length > 0 && selectedAccount && (
        <Card elevation={0} className="bg-transparent w-full p-0 grid">
          <div className="font-aeonik font-normal text-2xl my-8 text-white pl-1">Lending</div>
          <TableContainer>
            <Table className="w-full table-fixed">
              <TableBody className="w-full flex flex-col gap-4">
                {lentAssetInfos.map(({ position, walletBalance }, index) => (
                  <UserPositionRow
                    key={index}
                    position={position}
                    tokenBalance={walletBalance}
                    nativeSolBalance={nativeSol}
                    marginfiAccount={selectedAccount}
                    refreshBorrowLendState={refreshData}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      <div>
        {borrowedAssetInfos.length > 0 && selectedAccount && (
          <Card elevation={0} className="bg-transparent w-full p-0 grid">
            <div className="text-2xl my-8 text-white pl-1" style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
              Borrowing
            </div>
            <TableContainer>
              <Table className="table-fixed">
                <TableBody>
                  {borrowedAssetInfos.map(({ position, walletBalance }, index) => (
                    <UserPositionRow
                      key={index}
                      position={position}
                      tokenBalance={walletBalance}
                      nativeSolBalance={nativeSol}
                      marginfiAccount={selectedAccount}
                      refreshBorrowLendState={refreshData}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </div>
    </>
  );
};

export { UserPositions };
