import React, { FC, useMemo } from "react";
import { Card, Table, TableBody, TableContainer } from "@mui/material";
import { useBorrowLendState } from "~/context";
import UserPositionRow from "./UserPositionRow";
import { roundToDecimalPlace } from "~/utils";

const UserPositions: FC = () => {
  const { accountSummary, selectedAccount, refreshData } = useBorrowLendState();
  const { lendPositions, borrowPositions } = useMemo(
    () => ({
      lendPositions: accountSummary.positions.filter(
        (p) => p.isLending && roundToDecimalPlace(p.amount, p.bank.mintDecimals) > 0
      ),
      borrowPositions: accountSummary.positions.filter(
        (p) => !p.isLending && roundToDecimalPlace(p.amount, p.bank.mintDecimals) > 0
      ),
    }),
    [accountSummary]
  );

  return (
    <>
      {lendPositions.length > 0 && selectedAccount && (
        <Card elevation={0} className="bg-transparent w-full p-0 grid">
          <div className="font-aeonik font-normal text-2xl my-8 text-white pl-1">Lending</div>
          <TableContainer>
            <Table className="w-full table-fixed">
              <TableBody className="w-full flex flex-col gap-4">
                {lendPositions.map((position, index) => (
                  <UserPositionRow
                    key={index}
                    position={position}
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
        {borrowPositions.length > 0 && selectedAccount && (
          <Card elevation={0} className="bg-transparent w-full p-0 grid">
            <div className="text-2xl my-8 text-white pl-1" style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
              Borrowing
            </div>
            <TableContainer>
              <Table className="table-fixed">
                <TableBody>
                  {borrowPositions.map((position, index) => (
                    <UserPositionRow
                      key={index}
                      position={position}
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
