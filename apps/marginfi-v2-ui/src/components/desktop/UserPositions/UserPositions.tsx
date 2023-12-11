import React, { FC, useMemo } from "react";
import { Card, Table, TableBody, TableContainer, TableHead, TableCell, Typography, TableRow } from "@mui/material";
import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore } from "~/store";
import { MrgnTooltip } from "~/components/common/MrgnTooltip";

import UserPositionRow from "./UserPositionRow";

const UserPositions: FC = () => {
  const setIsRefreshingStore = useMrgnlendStore((state) => state.setIsRefreshingStore);
  const [selectedAccount, extendedBankInfos, fetchMrgnlendState] = useMrgnlendStore((state) => [
    state.selectedAccount,
    state.extendedBankInfos,
    state.fetchMrgnlendState,
  ]);

  const activeBankInfos = useMemo(
    () => extendedBankInfos.filter((balance) => balance.isActive),
    [extendedBankInfos]
  ) as ActiveBankInfo[];

  const { lendPositions, borrowPositions } = useMemo(
    () => ({
      lendPositions: activeBankInfos.filter((bankInfo) => bankInfo.position.isLending),
      borrowPositions: activeBankInfos.filter((bankInfo) => !bankInfo.position.isLending),
    }),
    [activeBankInfos]
  );

  return (
    <>
      {lendPositions.length > 0 && selectedAccount && (
        <Card elevation={0} className="bg-transparent w-full p-0 grid">
          <div className="font-aeonik font-normal text-2xl my-0 lg:mt-2 text-white">Lending</div>
          <TableContainer>
            <Table
              className="table-fixed"
              style={{
                borderCollapse: "separate",
                borderSpacing: "0px 8px",
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell className="border-none"></TableCell>
                  <TableCell
                    className="hidden md:table-cell border-none p-2"
                    style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                    align="right"
                  >
                    <Typography className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex justify-end gap-1">
                      Lending
                    </Typography>
                  </TableCell>
                  <TableCell
                    className="hidden md:table-cell border-none p-2"
                    style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                    align="right"
                  >
                    <Typography
                      className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex justify-end gap-1"
                      component="div"
                    >
                      Wtd
                      <div className="self-center">
                        <MrgnTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                Weighted values
                              </Typography>
                              <div className="flex flex-col gap-2 pb-2">
                                For risk purposes, token values are adjusted by oracle price bias and risk weights.
                              </div>
                              <div className="flex flex-col gap-2 pb-2">
                                Weighted prices used in risk calculations and are relevant to your health factor.
                              </div>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </MrgnTooltip>
                      </div>
                    </Typography>
                  </TableCell>
                  <TableCell
                    className="hidden md:table-cell border-none p-2"
                    style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                    align="right"
                  >
                    <Typography
                      className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex gap-1 justify-end"
                      component="div"
                    >
                      USD
                      <div className="self-center">
                        <MrgnTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                USD Values
                              </Typography>
                              <div className="flex flex-col gap-2 pb-2">
                                Unadjusted USD values are based on oracle mid prices - or the best estimate the oracle
                                has of average token price.
                              </div>
                              <div className="flex flex-col gap-2 pb-2">
                                Unadjusted USD values are not used in risk calculations. Values with price bias are used
                                because they are more conservative, and can control for oracle inaccuracies.
                              </div>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </MrgnTooltip>
                      </div>
                    </Typography>
                  </TableCell>
                  <TableCell className="border-none"></TableCell>
                  <TableCell className="border-none"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lendPositions.map((bankInfo, index) => (
                  <UserPositionRow
                    key={index}
                    activeBankInfo={bankInfo}
                    marginfiAccount={selectedAccount}
                    reloadPositions={async () => {
                      setIsRefreshingStore(true);
                      fetchMrgnlendState();
                    }}
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
            <div className="font-aeonik font-normal text-2xl my-0 lg:mt-2 text-white">Borrowing</div>
            <TableContainer>
              <Table
                className="table-fixed"
                style={{
                  borderCollapse: "separate",
                  borderSpacing: "0px 8px",
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell className="border-none"></TableCell>
                    <TableCell
                      className="hidden md:table-cell border-none p-2"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <Typography className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex justify-end gap-1">
                        Borrowing
                      </Typography>
                    </TableCell>
                    <TableCell
                      className="hidden md:table-cell border-none p-2"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <Typography
                        className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex justify-end gap-1"
                        component="div"
                      >
                        Wtd
                        <div className="self-center">
                          <MrgnTooltip
                            title={
                              <React.Fragment>
                                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                  Weighted values
                                </Typography>
                                <div className="flex flex-col gap-2 pb-2">
                                  For risk purposes, token values are adjusted by oracle price bias and risk weights.
                                </div>
                                <div className="flex flex-col gap-2 pb-2">
                                  Weighted prices used in risk calculations and are relevant to your health factor.
                                </div>
                              </React.Fragment>
                            }
                            placement="top"
                          >
                            <Image src="/info_icon.png" alt="info" height={16} width={16} />
                          </MrgnTooltip>
                        </div>
                      </Typography>
                    </TableCell>
                    <TableCell
                      className="hidden md:table-cell border-none p-2"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <Typography
                        className="text-[#A1A1A1] font-aeonik font-[300] text-sm flex justify-end gap-1"
                        component="div"
                      >
                        USD
                        <div className="self-center">
                          <MrgnTooltip
                            title={
                              <React.Fragment>
                                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                  USD Values
                                </Typography>
                                <div className="flex flex-col gap-2 pb-2">
                                  Unadjusted USD values are based on oracle mid prices - or the best estimate the oracle
                                  has of average token price.
                                </div>
                                <div className="flex flex-col gap-2 pb-2">
                                  Unadjusted USD values are not used in risk calculations. Values with price bias are
                                  used because they are more conservative, and can control for oracle inaccuracies.
                                </div>
                              </React.Fragment>
                            }
                            placement="top"
                          >
                            <Image src="/info_icon.png" alt="info" height={16} width={16} />
                          </MrgnTooltip>
                        </div>
                      </Typography>
                    </TableCell>
                    <TableCell className="border-none"></TableCell>
                    <TableCell className="border-none"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {borrowPositions.map((bankInfo, index) => (
                    <UserPositionRow
                      key={index}
                      activeBankInfo={bankInfo}
                      marginfiAccount={selectedAccount}
                      reloadPositions={async () => {
                        setIsRefreshingStore(true);
                        fetchMrgnlendState();
                      }}
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
