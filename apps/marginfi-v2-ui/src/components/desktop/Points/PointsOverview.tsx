import React, { FC } from "react";
import Image from "next/image";
import { Card, CardContent, Skeleton, Typography } from "@mui/material";
import { numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { UserPointsData } from "@mrgnlabs/marginfi-v2-ui-state";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface PointsOverviewProps {
  userPointsData: UserPointsData;
}

export const PointsOverview: FC<PointsOverviewProps> = ({ userPointsData }) => {
  return (
    <div className="max-w-[800px] w-full mx-auto   mt-4 ">
      <div className="grid grid-cols-2 gap-5 mb-4">
        <Card className="bg-[#131619] h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-base flex gap-1"
              gutterBottom
              component="div"
            >
              Total Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-base">Points</h4>
                        Points refresh every 24 hours.
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
              {userPointsData ? (
                numeralFormatter(userPointsData.totalPoints)
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </CardContent>
        </Card>
        <Card className="bg-[#131619] h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
              Global Rank {/* TODO: fix that with dedicated query */}
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
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
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 ">
        <Card className="bg-[#131619]  h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-base flex gap-1"
              gutterBottom
              component="div"
            >
              Lending Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-base">Lending</h4>
                        Lending earns 1 point per dollar lent per day.
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Typography>
            <Typography color="#fff" component="div" className="font-aeonik font-[500] text-2xl">
              {userPointsData ? (
                numeralFormatter(userPointsData.depositPoints)
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </CardContent>
        </Card>
        <Card className="bg-[#131619] h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-base flex gap-1"
              gutterBottom
              component="div"
            >
              Borrowing Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-base">Borrowing</h4>
                        Borrowing earns 4 points per dollar borrowed per day.
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
              {userPointsData ? (
                numeralFormatter(userPointsData.borrowPoints)
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </CardContent>
        </Card>
        <Card className="bg-[#131619] h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-base flex gap-1"
              gutterBottom
              component="div"
            >
              Referral Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-base">Earn more with friends</h4>
                        Earn 10% of the points any user you refer earns.
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
              {userPointsData ? (
                numeralFormatter(userPointsData.referralPoints)
              ) : (
                <Skeleton variant="rectangular" animation="wave" className="w-1/3 rounded-md top-[4px]" />
              )}
            </Typography>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
