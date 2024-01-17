import React, { FC } from "react";
import { Typography, Skeleton } from "@mui/material";
import Image from "next/image";
import { numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { UserPointsData } from "@mrgnlabs/marginfi-v2-ui-state";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Image src="/info_icon.png" alt="info" height={12} width={12} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-base">Points</h4>
                            Points refresh every 24 hours.
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
                  {userPointsData ? (
                    numeralFormatter(userPointsData.totalPoints)
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Image src="/info_icon.png" alt="info" height={12} width={12} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-base">CerEarn more with friends.</h4>
                            <p>
                              Use this option if you are unable to proceed with memo signing. It is free as well and
                              will not involve the network.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
