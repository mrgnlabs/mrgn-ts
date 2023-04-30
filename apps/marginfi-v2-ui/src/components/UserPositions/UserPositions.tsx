import React, { FC, useMemo } from "react";
import { Card, Table, TableBody, TableContainer, TableHead, TableCell } from "@mui/material";
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
            <Table className="table-fixed"
              style={{
                borderCollapse: 'separate',
                borderSpacing: '0px 8px',
              }}
            >
              <TableHead>
                <TableCell className="border-none"></TableCell>
                <TableCell className="text-[#A1A1A1] text-sm border-none px-2 hidden sm:table-cell" style={{ fontFamily: "Aeonik Pro", fontWeight: 300, }} align="right">Lending</TableCell>
                <TableCell className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell" style={{ fontFamily: "Aeonik Pro", fontWeight: 300, }} align="right">USD Value</TableCell>
                <TableCell className="border-none"></TableCell>
                <TableCell className="border-none"></TableCell>
              </TableHead>
              <TableBody>
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
              <Table className="table-fixed"
                style={{
                  borderCollapse: 'separate',
                  borderSpacing: '0px 8px',
                }}
              >
                <TableHead>
                  <TableCell className="border-none"></TableCell>
                  <TableCell className="text-[#A1A1A1] text-sm border-none px-2 hidden sm:table-cell" style={{ fontFamily: "Aeonik Pro", fontWeight: 300, }} align="right">Borrowing</TableCell>
                  <TableCell className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell" style={{ fontFamily: "Aeonik Pro", fontWeight: 300, }} align="right">USD Value</TableCell>
                  <TableCell className="border-none"></TableCell>
                  <TableCell className="border-none"></TableCell>
                </TableHead>
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
