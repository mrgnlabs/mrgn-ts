import React from "react";

import { numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { UserPointsData } from "@mrgnlabs/marginfi-v2-ui-state";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { IconInfoCircleFilled } from "~/components/ui/icons";

interface PointsOverviewProps {
  userPointsData: UserPointsData;
}

export const PointsOverview = ({ userPointsData }: PointsOverviewProps) => {
  return (
    <div className="max-w-[800px] w-full mx-auto mt-4">
      <div className="grid grid-cols-2 gap-5 mb-4">
        <div className="bg-background-gray-dark h-24 rounded-lg py-3.5 px-4">
          <h2 className="text-base flex gap-1.5 text-muted-foreground/80">
            Total Points
            <div className="self-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircleFilled size={16} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Points refresh every 24 hours.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </h2>
          <h3 className="text-white font-[500] text-3xl mt-1.5">
            {userPointsData && numeralFormatter(userPointsData.totalPoints)}
          </h3>
        </div>
        <div className="bg-background-gray-dark h-24 rounded-lg py-3.5 px-4">
          <h2 className="text-base flex gap-1.5 text-muted-foreground/80">
            Global Rank {/* TODO: fix that with dedicated query */}
          </h2>
          <h3 className="text-white font-[500] text-3xl mt-1.5">
            {userPointsData &&
              (userPointsData.userRank ? `#${groupedNumberFormatterDyn.format(userPointsData.userRank)}` : "-")}
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        <div className="bg-background-gray-dark h-24 rounded-lg py-3.5 px-4">
          <h2 className="text-base flex gap-1.5 text-muted-foreground/80">
            Lending Points
            <div className="self-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircleFilled size={16} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Lending earns 1 point per dollar lent per day.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </h2>
          <h3 className="text-white font-[500] text-2xl mt-1.5">
            {userPointsData && numeralFormatter(userPointsData.depositPoints)}
          </h3>
        </div>
        <div className="bg-background-gray-dark h-24 rounded-lg py-3.5 px-4">
          <h2 className="text-base flex gap-1.5 text-muted-foreground/80">
            Borrowing Points
            <div className="self-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircleFilled size={16} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Borrowing earns 4 points per dollar borrowed per day.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </h2>
          <h3 className="text-white font-[500] text-2xl mt-1.5">
            {userPointsData && numeralFormatter(userPointsData.borrowPoints)}
          </h3>
        </div>
        <div className="bg-background-gray-dark h-24 rounded-lg py-3.5 px-4">
          <h2 className="text-base flex gap-1.5 text-muted-foreground/80">
            Referral Points
            <div className="self-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircleFilled size={16} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Earn 10% of the points any user you refer earns.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </h2>
          <h3 className="text-white font-[500] text-2xl mt-1.5">
            {userPointsData && numeralFormatter(userPointsData.referralPoints)}
          </h3>
        </div>
      </div>
    </div>
  );
};
