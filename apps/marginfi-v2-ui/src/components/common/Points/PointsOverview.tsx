import React from "react";

import Link from "next/link";
import { IconInfoCircleFilled } from "@tabler/icons-react";

import { numeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { UserPointsData } from "@mrgnlabs/mrgn-state";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface PointsOverviewProps {
  userPointsData: UserPointsData;
}

export const PointsOverview = ({ userPointsData }: PointsOverviewProps) => {
  return (
    <>
      <div className="max-w-[800px] w-full mx-auto mt-4">
        <div className="grid grid-cols-2 gap-3 md:gap-5 mb-3 md:mb-5">
          <div className="bg-background-gray rounded-lg py-3.5 px-4">
            <h2 className="text-sm md:text-base flex gap-1.5 text-muted-foreground/80">
              Total Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled size={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Points refresh every 24 hours.{" "}
                        <Link
                          href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          More info
                        </Link>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </h2>
            <h3 className="text-white font-[500] text-2xl md:text-3xl mt-1.5">
              {userPointsData && numeralFormatter(userPointsData.totalPoints)}
            </h3>
          </div>
          <div className="bg-background-gray rounded-lg py-3.5 px-4">
            <h2 className="text-base flex gap-1.5 text-muted-foreground/80">
              Global Rank {/* TODO: fix that with dedicated query */}
            </h2>
            <h3 className="text-white font-[500] text-2xl md:text-3xl mt-1.5">
              {userPointsData &&
                (userPointsData.userRank ? `#${groupedNumberFormatterDyn.format(userPointsData.userRank)}` : "-")}
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5">
          <div className="bg-background-gray h-24 rounded-lg py-3.5 px-4">
            <h2 className="text-sm md:text-base flex gap-1.5 text-muted-foreground/80">
              Lending Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled size={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Lending earns 1 point per dollar lent per day.{" "}
                        <Link
                          href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          More info
                        </Link>
                        .
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </h2>
            <h3 className="text-white font-[500] text-2xl mt-1.5">
              {userPointsData && numeralFormatter(userPointsData.depositPoints)}
            </h3>
          </div>
          <div className="bg-background-gray h-24 rounded-lg py-3.5 px-4">
            <h2 className="text-sm md:text-base flex gap-1.5 text-muted-foreground/80">
              Borrowing Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled size={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Borrowing earns 4 points per dollar borrowed per day.{" "}
                        <Link
                          href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          More info
                        </Link>
                        .
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </h2>
            <h3 className="text-white font-[500] text-2xl mt-1.5">
              {userPointsData && numeralFormatter(userPointsData.borrowPoints)}
            </h3>
          </div>
          <div className="bg-background-gray h-24 rounded-lg py-3.5 px-4 col-span-2 md:col-span-1">
            <h2 className="text-sm md:text-base flex gap-1.5 text-muted-foreground/80">
              Referral Points
              <div className="self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled size={16} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Earn 10% of the points any user you refer earns.{" "}
                        <Link
                          href="https://medium.com/marginfi/introducing-mrgn-points-949e18f31a8c"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          More info
                        </Link>
                        .
                      </p>
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
    </>
  );
};
