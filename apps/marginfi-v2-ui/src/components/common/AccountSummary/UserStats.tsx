import React, { FC, useMemo } from "react";
import { Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";

import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { usdFormatter, numeralFormatter, usdFormatterDyn, percentFormatter } from "@mrgnlabs/mrgn-common";
import { IconAlertTriangle } from "~/components/ui/icons";

import { MrgnTooltip } from "~/components/common/MrgnTooltip";

import styles from "./style.module.css";

interface UserStatsProps {
  accountSummary: AccountSummary | null;
  healthFactor: number | null;
}

const UserStats: FC<UserStatsProps> = ({ accountSummary, healthFactor }) => {
  const healthColor = useMemo(() => {
    if (healthFactor) {
      let color;

      if (healthFactor >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (healthFactor >= 0.25) {
        color = "#B8B45F"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      return color;
    } else {
      return "#fff";
    }
  }, [healthFactor]);

  return (
    <div className={styles["hide-scrollbar"]}>
      <div className="flex flex-wrap sm:flex-nowrap gap-4 h-full w-full min-w-1/2 mt-[20px]">
        <div className="h-full  lg:flex w-1/5 min-w-1/5">
          <div>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-xs flex gap-1"
              gutterBottom
              component="div"
            >
              Account
              <div className="self-center">
                {accountSummary && (
                  <MrgnTooltip
                    title={
                      <React.Fragment>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Your account
                        </Typography>
                        <div className="flex flex-col gap-2 pb-2">
                          {`Without price bias, your account balance is ${usdFormatter.format(
                            accountSummary.balanceUnbiased
                          )}. With bias, your account balance is ${usdFormatter.format(accountSummary.balance)}.`}
                        </div>
                      </React.Fragment>
                    }
                    placement="top"
                  >
                    <div className="w-[12px] h-[12px]">
                      <Image src="/info_icon.png" alt="info" height={12} width={12} />
                    </div>
                  </MrgnTooltip>
                )}
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
              {accountSummary ? (
                <>
                  <div className="sm:hidden">{`$${numeralFormatter(accountSummary.balanceUnbiased)}`}</div>

                  <div className="hidden sm:block xl:hidden">
                    {Math.round(accountSummary.balanceUnbiased) > 10000
                      ? usdFormatterDyn.format(Math.round(accountSummary.balanceUnbiased))
                      : usdFormatter.format(accountSummary.balanceUnbiased)}
                  </div>

                  <div className="hidden xl:block">{usdFormatter.format(accountSummary.balanceUnbiased)}</div>
                </>
              ) : (
                "-"
              )}
            </Typography>
          </div>
        </div>
        <DividerLine />
        <div className="h-full w-1/4 md:w-1/5">
          <div>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-xs flex gap-1"
              gutterBottom
              component="div"
            >
              Supplying
              <div className="self-center">
                {accountSummary && (
                  <MrgnTooltip
                    title={
                      <React.Fragment>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          How much are you lending?
                        </Typography>
                        <div className="flex flex-col gap-2 pb-2">
                          {`Your assets are worth ${usdFormatter.format(
                            accountSummary.lendingAmountUnbiased
                          )} without price bias and ${usdFormatter.format(
                            accountSummary.lendingAmount
                          )} with price bias.`}
                        </div>
                      </React.Fragment>
                    }
                    placement="top"
                  >
                    <div className="w-[12px] h-[12px]">
                      <Image src="/info_icon.png" alt="info" height={12} width={12} />
                    </div>
                  </MrgnTooltip>
                )}
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
              {accountSummary ? (
                <>
                  <div className="sm:hidden">{`$${numeralFormatter(accountSummary.lendingAmountUnbiased)}`}</div>

                  <div className="hidden sm:block xl:hidden">
                    {Math.round(accountSummary.lendingAmountUnbiased) > 10000
                      ? usdFormatterDyn.format(Math.round(accountSummary.lendingAmountUnbiased))
                      : usdFormatter.format(accountSummary.lendingAmountUnbiased)}
                  </div>

                  <div className="hidden xl:block">{usdFormatter.format(accountSummary.lendingAmountUnbiased)}</div>
                </>
              ) : (
                "-"
              )}
            </Typography>
          </div>
        </div>
        <DividerLine />
        <div className="h-full w-1/4 md:w-1/5">
          <div>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-xs flex gap-1"
              gutterBottom
              component="div"
            >
              Borrowing
              <div className="self-center">
                {accountSummary && (
                  <MrgnTooltip
                    title={
                      <React.Fragment>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          How much are you borrowing?
                        </Typography>
                        <div className="flex flex-col gap-2 pb-2">
                          {`Your liabilities are worth ${usdFormatter.format(
                            accountSummary.borrowingAmountUnbiased
                          )} without price bias and ${usdFormatter.format(
                            accountSummary.borrowingAmount
                          )} with price bias.`}
                        </div>
                      </React.Fragment>
                    }
                    placement="top"
                  >
                    <div className="w-[12px] h-[12px]">
                      <Image src="/info_icon.png" alt="info" height={12} width={12} />
                    </div>
                  </MrgnTooltip>
                )}
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-lg md:text-xl" component="div">
              {accountSummary ? (
                <>
                  <div className="sm:hidden">{`$${numeralFormatter(accountSummary.borrowingAmountUnbiased)}`}</div>

                  <div className="hidden sm:block xl:hidden">
                    {Math.round(accountSummary.borrowingAmountUnbiased) > 10000
                      ? usdFormatterDyn.format(Math.round(accountSummary.borrowingAmountUnbiased))
                      : usdFormatter.format(accountSummary.borrowingAmountUnbiased)}
                  </div>

                  <div className="hidden xl:block">{usdFormatter.format(accountSummary.borrowingAmountUnbiased)}</div>
                </>
              ) : (
                "-"
              )}
            </Typography>
          </div>
        </div>
        <DividerLine />
        <div className="h-full w-1/4 md:w-1/5">
          <div>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-xs flex gap-1"
              gutterBottom
              component="div"
            >
              Health
              <div className="self-center">
                {accountSummary && (
                  <MrgnTooltip
                    title={
                      <React.Fragment>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Health Factor
                        </Typography>
                        <div className="flex flex-col gap-2 pb-2">
                          <div>
                            Health factor is based off of <b>price biased</b> and <b>weighted</b> asset and liability
                            values.
                          </div>
                          <div className="font-bold pb-2">
                            <IconAlertTriangle height={16} className="inline -translate-y-[1px]" /> When your account
                            health reaches 0% or below, you are exposed to liquidation.
                          </div>
                          <div>The formula is:</div>
                          <div className="text-sm text-center">{"(assets - liabilities) / (assets)"}</div>
                          <div>Your math is:</div>
                          <div className="text-sm text-center">{`(${usdFormatter.format(
                            accountSummary.lendingAmountWithBiasAndWeighted
                          )} - ${usdFormatter.format(
                            accountSummary.borrowingAmountWithBiasAndWeighted
                          )}) / (${usdFormatter.format(accountSummary.lendingAmountWithBiasAndWeighted)})`}</div>
                        </div>
                      </React.Fragment>
                    }
                    placement="top"
                  >
                    <div className="w-[12px] h-[12px]">
                      <div className="w-[12px] h-[12px]">
                        <Image src="/info_icon.png" alt="info" height={12} width={12} />
                      </div>
                    </div>
                  </MrgnTooltip>
                )}
              </div>
              <div className="self-center"></div>
            </Typography>
            <Typography color={healthColor} className="font-aeonik font-[500] text-lg md:text-xl" component="div">
              {healthFactor ? percentFormatter.format(healthFactor) : "-"}
            </Typography>
          </div>
        </div>
        <DividerLine />
        <div className="h-full w-1/4 md:w-1/5">
          <div>
            <Typography
              color="#868E95"
              className="font-aeonik font-[300] text-xs flex gap-1"
              gutterBottom
              component="div"
            >
              Free
              <div className="self-center">
                <MrgnTooltip
                  title={
                    <React.Fragment>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Free Collateral
                      </Typography>
                      <div className="flex flex-col gap-2 pb-2">
                        <div>
                          Free collateral indicates how much of your collateral is available to open additional borrows
                          or withdraw existing collateral.
                        </div>
                        <div>It is computed from the weighted deposits and weighted borrows.</div>
                      </div>
                    </React.Fragment>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={12} width={12} />
                </MrgnTooltip>
              </div>
              <div className="self-center"></div>
            </Typography>
            <Typography
              color={!accountSummary || accountSummary.signedFreeCollateral >= 0 ? "#fff" : "#B8B45F"}
              className="font-aeonik font-[500] text-lg md:text-xl"
              component="div"
            >
              {accountSummary ? usdFormatter.format(accountSummary.signedFreeCollateral) : "-"}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
};

const DividerLine = () => <div style={{ width: "1px", borderLeft: "1px solid #555" }} />;

export { UserStats };
