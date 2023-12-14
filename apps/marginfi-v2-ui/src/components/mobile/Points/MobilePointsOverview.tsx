import React, { FC } from "react";
import { Typography, Skeleton } from "@mui/material";
import Image from "next/image";
import { numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { UserPointsData } from "@mrgnlabs/marginfi-v2-ui-state";

import { MrgnTooltip } from "~/components/common/MrgnTooltip";

import styles from "./style.module.css";

interface MobilePointsOverviewProps {
  userPointsData: UserPointsData;
}

export const MobilePointsOverview: FC<MobilePointsOverviewProps> = ({ userPointsData }) => {
  return (
    <div className="flex flex-col w-full justify-between items-left gap-4  max-w-[900px]">
      <div className="lg:block flex-1">
        <div className="h-full rounded-xl">
          <div className={styles["hide-scrollbar"]}>
            <div className="w-full min-w-1/2 max-h-[50px] flex flex-wrap justify-between overflow-hidden gap-4 mt-[20px]">
              <div className="h-full flex-1">
                <Typography
                  color="#868E95"
                  className="font-aeonik font-[300] text-xs flex gap-1"
                  gutterBottom
                  component="div"
                >
                  Total Points
                  <div className="self-center">
                    <MrgnTooltip
                      title={
                        <>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            Points
                          </Typography>
                          Points refresh every 24 hours.{" "}
                        </>
                      }
                      placement="top"
                    >
                      <div className="w-[12px] h-[12px]">
                        <Image src="/info_icon.png" alt="info" height={12} width={12} />
                      </div>
                    </MrgnTooltip>
                  </div>
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
                  {userPointsData ? (
                    `$${numeralFormatter(userPointsData.totalPoints)}`
                  ) : (
                    <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                  )}
                </Typography>
              </div>
              <DividerLine />
              <div className="h-full flex-1">
                <Typography
                  color="#868E95"
                  className="font-aeonik font-[300] text-xs flex gap-1"
                  gutterBottom
                  component="div"
                >
                  Global Rank {/* TODO: fix that with dedicated query */}
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
                  {userPointsData ? (
                    userPointsData.userRank ? (
                      `#${groupedNumberFormatterDyn.format(userPointsData.userRank)}`
                    ) : (
                      "-"
                    )
                  ) : (
                    <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                  )}
                </Typography>
              </div>
              <DividerLine />
              <div className="h-full flex-1">
                <Typography
                  color="#868E95"
                  className="font-aeonik font-[300] text-xs flex gap-1"
                  gutterBottom
                  component="div"
                >
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
                      <div className="w-[12px] h-[12px]">
                        <Image src="/info_icon.png" alt="info" height={12} width={12} />
                      </div>
                    </MrgnTooltip>
                  </div>
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
                  {userPointsData ? (
                    numeralFormatter(userPointsData.referralPoints)
                  ) : (
                    <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
                  )}
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DividerLine = () => <div style={{ width: "1px", borderLeft: "1px solid #555" }} />;
