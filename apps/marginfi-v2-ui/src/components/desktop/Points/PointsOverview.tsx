import Image from "next/image";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { Card, CardContent, Skeleton, TableCell, TableRow, Typography } from "@mui/material";
import React, { FC, useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  groupedNumberFormatter,
  uiToNative,
  usdFormatter,
  numeralFormatter,
  groupedNumberFormatterDyn,
} from "@mrgnlabs/mrgn-common";
import { MrgnTooltip } from "~/components/common/MrgnTooltip";
import { AccountSummary, UserPointsData } from "@mrgnlabs/marginfi-v2-ui-state";

interface PointsLeaderBoardProps {
  userPointsData: UserPointsData;
}

export const PointsOverview: FC<PointsLeaderBoardProps> = ({ userPointsData }) => {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-2/3">
        <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
              Total Points
              <div className="self-center">
                <MrgnTooltip
                  title={
                    <>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Points
                      </Typography>
                      Points refresh every 24 hours.
                    </>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </MrgnTooltip>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
              {userPointsData.totalPoints > 0 ? (
                numeralFormatter(userPointsData.totalPoints)
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </CardContent>
        </Card>
        <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
              Global Rank {/* TODO: fix that with dedicated query */}
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
              {userPointsData.userRank && userPointsData.userRank > 0 ? (
                `#${groupedNumberFormatterDyn.format(userPointsData.userRank)}`
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-2/3">
        <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
              Lending Points
              <div className="self-center">
                <MrgnTooltip
                  title={
                    <>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Lending
                      </Typography>
                      Lending earns 1 point per dollar lent per day.
                    </>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </MrgnTooltip>
              </div>
            </Typography>
            <Typography color="#fff" component="div" className="font-aeonik font-[500] text-2xl">
              {userPointsData.depositPoints > 0 ? (
                numeralFormatter(userPointsData.depositPoints)
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </CardContent>
        </Card>
        <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
              Borrowing Points
              <div className="self-center">
                <MrgnTooltip
                  title={
                    <>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Borrowing
                      </Typography>
                      Borrowing earns 4 points per dollar borrowed per day.
                    </>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </MrgnTooltip>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
              {userPointsData.borrowPoints > 0 ? (
                numeralFormatter(userPointsData.borrowPoints)
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </CardContent>
        </Card>
        <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
              Referral Points
              <div className="self-center">
                <MrgnTooltip
                  title={
                    <>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Earn more with friends
                      </Typography>
                      Earn 10% of the points any user you refer earns.
                    </>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </MrgnTooltip>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
              {userPointsData.referralPoints > 0 ? numeralFormatter(userPointsData.referralPoints) : "-"}
            </Typography>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
