import React, { FC, useMemo } from "react";
import { Card, Table, TableBody, TableContainer } from "@mui/material";
import { useTokenAccounts, useUserAccounts } from "~/context";
import UserPositionRow from "./UserPositionRow";

const UserPositions: FC = () => {
  const { selectedAccount, activeBankInfos, reload } = useUserAccounts();
  const { tokenAccountMap } = useTokenAccounts();

  const { lendPositions, borrowPositions } = useMemo(
    () => ({
      lendPositions: activeBankInfos.filter((bankInfo) => bankInfo.position.isLending),
      borrowPositions: activeBankInfos.filter((bankInfo) => !bankInfo.position.isLending),
    }),
    [activeBankInfos]
  );

  const { lentAssetInfos, borrowedAssetInfos } = useMemo(
    () => ({
      lentAssetInfos: lendPositions.map((bankInfo) => ({
        bankInfo,
        tokenBalance: tokenAccountMap.get(bankInfo.bank.mint.toBase58())?.balance || 0,
      })),
      borrowedAssetInfos: borrowPositions.map((bankInfo) => ({
        bankInfo,
        tokenBalance: tokenAccountMap.get(bankInfo.bank.mint.toBase58())?.balance || 0,
      })),
    }),
    [borrowPositions, lendPositions, tokenAccountMap]
  );

  return (
    <>
      {lentAssetInfos.length > 0 && selectedAccount && (
        <Card elevation={0} className="bg-transparent w-full p-0 grid">
          <div className="font-aeonik font-normal text-2xl my-8 text-white pl-1">Lending</div>
          <TableContainer>
            <Table className="w-full table-fixed">
              <TableBody className="w-full flex flex-col gap-4">
                {lentAssetInfos.map(({ bankInfo }, index) => (
                  <UserPositionRow
                    key={index}
                    activeBankInfo={bankInfo}
                    marginfiAccount={selectedAccount}
                    reloadPositions={reload}
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
                  {borrowedAssetInfos.map(({ bankInfo, tokenBalance }, index) => (
                    <UserPositionRow
                      key={index}
                      activeBankInfo={bankInfo}
                      marginfiAccount={selectedAccount}
                      reloadPositions={reload}
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
