import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { useWallet } from "@solana/wallet-adapter-react";
import React, { FC, useMemo, useState, useEffect } from "react";
import { usdFormatter, percentFormatter, numeralFormatter, usdFormatterDyn, groupedNumberFormatter } from "~/utils/formatters";
import { RewardMetric } from "./AccountMetric";
import { useUserAccounts } from "~/context";
import { Card, CardContent, Typography, Skeleton } from '@mui/material';
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { ExtendedBankInfo } from "~/types";
import Image from "next/image";
import { styled } from "@mui/material/styles";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import Link from 'next/link';

const firebaseConfig = {
  apiKey: "AIzaSyBPAKOn7YKvEHg6iXTRbyZws3G4kPhWjtQ",
  authDomain: "marginfi-dev.firebaseapp.com",
  projectId: "marginfi-dev",
  storageBucket: "marginfi-dev.appspot.com",
  messagingSenderId: "509588742572",
  appId: "1:509588742572:web:18d74a3ace2f3aa2071a09"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "rgb(227, 227, 227)",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
  },
}));

const AccountSummary: FC = () => {
  const { accountSummary, selectedAccount, extendedBankInfos } = useUserAccounts();
  const wallet = useWallet();
  const [globalPoints, setGlobalPoints] = useState<number | null>(null);
  const [healthColor, setHealthColor] = useState<string | null>(null);

  const healthFactor = useMemo(() => {
    if (selectedAccount) {
      const { assets, liabilities } = selectedAccount.getHealthComponents(MarginRequirementType.Maint);
      return assets.isZero() ? 1 : assets.minus(liabilities).dividedBy(assets).toNumber();
    } else {
      return null;
    }
  }, [selectedAccount]);

  const calculateTotal = (bankInfos: ExtendedBankInfo[], field: string): number => {
    return bankInfos.reduce((accumulator: number, bankInfo: any) => accumulator + bankInfo[field] * bankInfo.tokenPrice, 0);
  };

  const globalDeposits = useMemo(() => calculateTotal(extendedBankInfos, 'totalPoolDeposits'), [extendedBankInfos]);
  const globalBorrows = useMemo(() => calculateTotal(extendedBankInfos, 'totalPoolBorrows'), [extendedBankInfos]);
  const globalTVL = useMemo(() => Math.max(globalDeposits - globalBorrows, 0), [globalDeposits, globalBorrows]);

  useEffect(() => {
    const calculateTotalPoints = async () => {
      const pointsCollection = collection(db, 'points');
      const pointSnapshot = await getDocs(pointsCollection);
      let totalPoints = 0;

      pointSnapshot.forEach((doc) => {
        totalPoints += doc.data().total_points ? parseFloat(doc.data().total_points) : 0;
      });

      setGlobalPoints(totalPoints);
    };

    calculateTotalPoints();
  }, []);

  useEffect(() => {
    if (healthFactor) {
      let color;

      if (healthFactor >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (healthFactor >= 0.25) {
        color = "#B8B45F"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      setHealthColor(color);
    }
  }, [healthFactor]);

  return (
    <div className="flex flex-col items-center w-full max-w-7xl gap-5 col-span-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 w-full">

        {/*******************************/}
        {/* [START]: GLOBAL METRICS */}
        {/*******************************/}

        <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
              Global Supplied
              <div className="self-center">
                <HtmlTooltip
                  title={
                    <React.Fragment>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Global Supplied
                      </Typography>
                      Total value supplied across all assets in the marginfi protocol.
                    </React.Fragment>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </HtmlTooltip>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
              {
                globalDeposits ?
                  `$${numeralFormatter(globalDeposits)}`
                  :
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    className="w-1/3 rounded-md top-[4px]"
                  />
              }
            </Typography>
          </CardContent>
        </Card>
        <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
              Global Borrowed
              <div className="self-center">
                <HtmlTooltip
                  title={
                    <React.Fragment>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Global Borrowed
                      </Typography>
                      Total value borrowed across all assets in the marginfi protocol.
                    </React.Fragment>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </HtmlTooltip>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
              {
                globalBorrows ?
                  `$${numeralFormatter(globalBorrows)}`
                  :
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    className="w-1/3 rounded-md top-[4px]"
                  />
              }
            </Typography>
          </CardContent>
        </Card>
        <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
              Global TVL
              <div className="self-center">
                <HtmlTooltip
                  title={
                    <React.Fragment>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Global TVL
                      </Typography>
                      <div className="flex flex-col gap-2 pb-2">
                        <div>Total value locked in the marginfi protocol, calculated as:</div>
                        <div className="text-sm text-center">{"deposits - borrowed"}</div>
                      </div>
                    </React.Fragment>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </HtmlTooltip>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
              {
                globalTVL ?
                  `$${numeralFormatter(globalTVL)}`
                  :
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    className="w-1/3 rounded-md top-[4px]"
                  />
              }
            </Typography>
          </CardContent>
        </Card>
        <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
          <CardContent>
            <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
              Global Points
              <div className="self-center">
                <HtmlTooltip
                  title={
                    <React.Fragment>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Points
                      </Typography>
                      <div className="flex flex-col gap-2 pb-2">
                        <div>Learn more about points <Link href="/points"><u>here</u></Link>.</div>
                      </div>
                    </React.Fragment>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </HtmlTooltip>
              </div>
            </Typography>
            <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
              {
                globalPoints ?
                  numeralFormatter(globalPoints)
                  :
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    className="w-1/3 rounded-md top-[4px]"
                  />
              }
            </Typography>
          </CardContent>
        </Card>

        {/*******************************/}
        {/* [END]: GLOBAL METRICS */}
        {/*******************************/}

        {/*******************************/}
        {/* [ACCOUNT]: GLOBAL METRICS */}
        {/*******************************/}

        {
          wallet.connected &&
          <>
            <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
              <CardContent>
                <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                  Account Balance
                  <div className="self-center">
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            Your account
                          </Typography>
                          <div className="flex flex-col gap-2 pb-2">
                            {`Without price bias, your account balance is ${usdFormatter.format(accountSummary.balanceUnbiased)
                              }. With bias, your account balance is ${usdFormatter.format(accountSummary.balance)
                              }.`}
                          </div>
                          <Link href="https://t.me/mrgncommunity"><u>Learn why price bias matters.</u></Link>
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                  {
                    accountSummary.balanceUnbiased ?
                      <>
                        <div className="sm:hidden">
                          {`$${numeralFormatter(accountSummary.balanceUnbiased)}`}
                        </div>

                        <div className="hidden sm:block xl:hidden">
                          {
                            Math.round(accountSummary.balanceUnbiased) > 10000 ?
                              usdFormatterDyn.format(Math.round(accountSummary.balanceUnbiased))
                              :
                              usdFormatter.format(accountSummary.balanceUnbiased)
                          }
                        </div>

                        <div className="hidden xl:block">
                          {usdFormatter.format(accountSummary.balanceUnbiased)}
                        </div>
                      </>
                      :
                      <Skeleton
                        variant="rectangular"
                        animation="wave"
                        className="w-1/3 rounded-md top-[4px]"
                      />
                  }
                </Typography>
              </CardContent>
            </Card>
            <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
              <CardContent>
                <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                  Supplying
                  <div className="self-center">
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            How much are you lending?
                          </Typography>
                          <div className="flex flex-col gap-2 pb-2">
                            {`Your assets are worth ${usdFormatter.format(accountSummary.lendingAmountUnbiased)
                              } without price bias and ${usdFormatter.format(accountSummary.lendingAmount)
                              } with price bias.`}
                          </div>
                          <Link href="https://t.me/mrgncommunity"><u>Learn why price bias matters.</u></Link>
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                  {
                    accountSummary.lendingAmountUnbiased ?
                      <>
                        <div className="sm:hidden">
                          {`$${numeralFormatter(accountSummary.lendingAmountUnbiased)}`}
                        </div>

                        <div className="hidden sm:block xl:hidden">
                          {
                            Math.round(accountSummary.lendingAmountUnbiased) > 10000 ?
                              usdFormatterDyn.format(Math.round(accountSummary.lendingAmountUnbiased))
                              :
                              usdFormatter.format(accountSummary.lendingAmountUnbiased)
                          }
                        </div>

                        <div className="hidden xl:block">
                          {usdFormatter.format(accountSummary.lendingAmountUnbiased)}
                        </div>
                      </>
                      :
                      <Skeleton
                        variant="rectangular"
                        animation="wave"
                        className="w-1/3 rounded-md top-[4px]"
                      />
                  }
                </Typography>
              </CardContent>
            </Card>
            <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
              <CardContent>
                <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                  Borrowing
                  <div className="self-center">
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            How much are you borrowing?
                          </Typography>
                          <div className="flex flex-col gap-2 pb-2">
                            {`Your liabilities are worth ${usdFormatter.format(accountSummary.borrowingAmountUnbiased)
                              } without price bias and ${usdFormatter.format(accountSummary.borrowingAmount)
                              } with price bias.`}
                          </div>
                          <Link href="https://t.me/mrgncommunity"><u>Learn why price bias matters.</u></Link>
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                  {
                    accountSummary.borrowingAmountUnbiased !== undefined && accountSummary.borrowingAmountUnbiased !== null ?
                      <>
                        <div className="sm:hidden">
                          {`$${numeralFormatter(accountSummary.borrowingAmountUnbiased)}`}
                        </div>

                        <div className="hidden sm:block xl:hidden">
                          {
                            Math.round(accountSummary.borrowingAmountUnbiased) > 10000 ?
                              usdFormatterDyn.format(Math.round(accountSummary.borrowingAmountUnbiased))
                              :
                              usdFormatter.format(accountSummary.borrowingAmountUnbiased)
                          }
                        </div>

                        <div className="hidden xl:block">
                          {usdFormatter.format(accountSummary.borrowingAmountUnbiased)}
                        </div>
                      </>
                      :
                      <Skeleton
                        variant="rectangular"
                        animation="wave"
                        className="w-1/3 rounded-md top-[4px]"
                      />
                  }
                </Typography>
              </CardContent>
            </Card>
            <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
              <CardContent>
                <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                  Health Factor
                  <div className="self-center">
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            Health Factor
                          </Typography>
                          <div className="flex flex-col gap-2 pb-2">
                            <div>Health factor is based off of <b>price biased</b> and <b>weighted</b> asset and liability values.</div>
                            <div>The formula is:</div>
                            <div className="text-sm text-center">{"(assets - liabilities) / (assets)"}</div>
                            <div>Your math is:</div>
                            <div className="text-sm text-center">{`(${usdFormatter.format(accountSummary.lendingAmountWithBiasAndWeighted)
                              } - ${usdFormatter.format(accountSummary.borrowingAmountWithBiasAndWeighted)
                              }) / (${usdFormatter.format(accountSummary.lendingAmountWithBiasAndWeighted)
                              })`}</div>
                          </div>
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                  <div className="self-center">
                  </div>
                </Typography>
                <Typography
                  //@ts-ignore
                  color={healthFactor ? healthColor : "#fff"}
                  className="font-aeonik font-[500] text-3xl" component="div">
                  {
                    healthFactor ?
                      percentFormatter.format(healthFactor)
                      :
                      <Skeleton
                        variant="rectangular"
                        animation="wave"
                        className="w-1/3 rounded-md top-[4px]"
                      />
                  }
                </Typography>
              </CardContent>
            </Card>
          </>
        }

      </div>
    </div>
  );
};

export { AccountSummary };
