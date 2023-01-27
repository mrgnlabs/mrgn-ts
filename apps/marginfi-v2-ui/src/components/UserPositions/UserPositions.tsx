import React, { FC, useMemo } from "react";
import { Card, Table, TableBody, TableContainer } from "@mui/material";
import { useBorrowLendState } from "~/context";
import UserPositionRow from "./UserPositionRow";
import { roundToDecimalPlace } from "~/utils";

const UserPositions: FC = () => {
  const { accountSummary, selectedAccount, refreshData } = useBorrowLendState();
  const { isLending, isBorrowing } = useMemo(
    () => ({
      isLending: accountSummary.lendingAmount > 0,
      isBorrowing: accountSummary.borrowingAmount > 0,
    }),
    [accountSummary]
  );

  return (
    <>
      {isLending && selectedAccount && (
        <Card elevation={0} className="bg-transparent w-full p-0 grid">
          <div className="text-2xl my-8 text-white pl-1" style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
            Lending
          </div>
          <TableContainer>
            <Table className="table-fixed">
              <TableBody className="flex flex-col gap-4">
                {accountSummary.positions
                  .filter((p) => p.isLending && roundToDecimalPlace(p.amount, p.bank.mintDecimals) > 0)
                  .map((position, index) => (
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
        {isBorrowing && selectedAccount && (
          <Card elevation={0} className="bg-transparent w-full p-0 grid">
            <div className="text-2xl my-8 text-white pl-1" style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
              Borrowing
            </div>
            <TableContainer>
              <Table className="table-fixed">
                <TableBody>
                  {accountSummary.positions
                    .filter((p) => !p.isLending)
                    .map((position, index) => (
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
