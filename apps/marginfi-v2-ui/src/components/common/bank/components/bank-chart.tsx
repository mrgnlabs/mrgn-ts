"use client";

import React, { useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { IconLoader2 } from "@tabler/icons-react";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { useExtendedBanks, useBankChart } from "@mrgnlabs/mrgn-state";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Switch } from "~/components/ui/switch";

import { formatDate, formatChartData, generateInterestCurveData } from "../utils/bank-chart.utils";
import { chartConfigs, chartColors } from "../types";

type Tabs = "rates" | "tvl" | "interest-curve";

type BankChartProps = {
  bankAddress: string;
  tab?: Tabs;
};

const headerContent: Record<Tabs, { title: string; description: string }> = {
  tvl: {
    title: "TVL",
    description: "This chart is a historical view of the total locked value in the bank.",
  },
  rates: {
    title: "Rates",
    description: "This chart is a historical view of the deposit and borrow rates.",
  },
  "interest-curve": {
    title: "Interest rate curves",
    description: "This chart represents the interest curves at different utilization rates.",
  },
};

const BankChart = ({ bankAddress, tab = "tvl" }: BankChartProps) => {
  const [activeTab, setActiveTab] = React.useState<"tvl" | "rates" | "interest-curve">(tab);
  const [showUSD, setShowUSD] = React.useState(false);
  const { extendedBanks } = useExtendedBanks();

  React.useEffect(() => {
    if (activeTab !== "tvl") {
      setShowUSD(false);
    }
  }, [activeTab]);

  const bank = React.useMemo(() => {
    return extendedBanks.find((bank) => bank.address.toBase58() === bankAddress);
  }, [extendedBanks, bankAddress]);

  const isNativeStakeBank = bank?.info.rawBank.config.assetTag === 2;

  const currentUtilizationRateDecimal = React.useMemo(() => {
    if (!bank) return 0;
    return bank.info.state.utilizationRate / 100; // Convert from percentage to decimal
  }, [bank]);

  const { data, error, isLoading } = useBankChart(bankAddress, bank);
  const chartConfig = (() => {
    switch (activeTab) {
      case "tvl":
        return chartConfigs.tvl;
      case "rates":
        return chartConfigs.rates;
      case "interest-curve":
        return chartConfigs.interestCurve;
      default:
        return chartConfigs.tvl;
    }
  })();
  const chartOptions = (() => {
    switch (activeTab) {
      case "tvl":
        return {
          yAxisLabel: showUSD ? "USD" : "Tokens",
          tooltipLabel: showUSD ? "USD" : bank?.meta.tokenSymbol || "Tokens",
          domain: [0, "auto"] as [number, "auto"],
        };
      case "rates":
        return {
          yAxisLabel: "",
          tooltipLabel: "%",
          domain: [0, "auto"] as [number, "auto"],
        };
      case "interest-curve":
        return {
          yAxisLabel: "",
          tooltipLabel: "%",
          domain: [0, 1] as [number, number],
        };
      default:
        return {
          yAxisLabel: "",
          tooltipLabel: "",
          domain: [0, "auto"] as [number, "auto"],
        };
    }
  })();

  const hasError = Boolean(error) || !data || data.length === 0;
  const errorMessage = error ? error.message : "No data available";

  const formattedData = React.useMemo(() => {
    return formatChartData(hasError ? null : data, showUSD);
  }, [data, hasError, showUSD]);

  const interestCurveData = React.useMemo(() => {
    const latestDataPoint = formattedData[formattedData.length - 1];
    return generateInterestCurveData(latestDataPoint);
  }, [formattedData]);

  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && !hasError) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-medium">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-medium text-foreground">
                {(() => {
                  switch (activeTab) {
                    case "tvl":
                      return showUSD
                        ? `$${dynamicNumeralFormatter(entry.value)}`
                        : `${dynamicNumeralFormatter(entry.value)} ${bank?.meta.tokenSymbol || ""}`;
                    case "rates":
                    case "interest-curve":
                      return `${entry.value.toFixed(2)}%`;
                    default:
                      return entry.value;
                  }
                })()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  if (isLoading) {
    return (
      <Card className="w-full bg-background-gray h-[520px] flex flex-col items-center justify-center">
        <CardContent className="flex flex-col items-center justify-center w-full h-full gap-2">
          <IconLoader2 size={16} className="animate-spin" />
          <p className="text-muted-foreground">Loading chart...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent border-none h-full md:h-[520px]">
      <CardHeader className="sr-only">
        <CardTitle>Bank History</CardTitle>
        <CardDescription>
          Chart showing interest rates and total deposits and borrows over the last 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 rounded-lg space-y-4 relative bg-background-gray pt-8">
        <div className="flex items-center justify-between px-3">
          <div className="max-w-[65%] flex flex-col items-start justify-start gpa-1">
            <h3 className="text-lg">{headerContent[activeTab].title}</h3>

            <p className="text-sm text-muted-foreground">{headerContent[activeTab].description}</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            {activeTab === "tvl" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">USD</span>
                <Switch
                  checked={showUSD}
                  onCheckedChange={setShowUSD}
                  className="data-[state=unchecked]:bg-background-gray-light"
                  disabled={hasError}
                />
              </div>
            )}
            <ToggleGroup
              type="single"
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "tvl" | "rates" | "interest-curve")}
              className="p-1.5 rounded-md"
              disabled={hasError}
            >
              <ToggleGroupItem
                value="tvl"
                className="text-muted-foreground font-normal h-[1.65rem] data-[state=on]:font-medium data-[state=on]:bg-mfi-action-box-accent data-[state=on]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent/50 disabled:opacity-50"
              >
                TVL
              </ToggleGroupItem>
              {!isNativeStakeBank && (
                <ToggleGroupItem
                  value="rates"
                  className="text-muted-foreground font-normal h-[1.65rem] data-[state=on]:font-medium data-[state=on]:bg-mfi-action-box-accent data-[state=on]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent/50 disabled:opacity-50"
                >
                  Rates
                </ToggleGroupItem>
              )}

              <ToggleGroupItem
                value="interest-curve"
                className="text-muted-foreground font-normal h-[1.65rem] data-[state=on]:font-medium data-[state=on]:bg-mfi-action-box-accent data-[state=on]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent/50 disabled:opacity-50"
              >
                IR Curve
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Error Overlay */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background-gray/50 rounded-lg">
            <div className="bg-background border border-border rounded-lg p-4 shadow-lg">
              <p className="text-muted-foreground text-center">{errorMessage}</p>
            </div>
          </div>
        )}

        <ChartContainer config={chartConfig} className="lg:h-[420px] w-full">
          <AreaChart
            key={activeTab}
            data={activeTab === "interest-curve" ? interestCurveData : formattedData}
            margin={{
              top: 24,
              right: 24,
              bottom: 6,
              left: 0,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={activeTab === "interest-curve" ? "utilization" : "timestamp"}
              type={activeTab === "interest-curve" ? "number" : undefined}
              domain={activeTab === "interest-curve" ? [0, 1] : undefined}
              tickFormatter={
                activeTab === "interest-curve" ? (value: number) => `${(value * 100).toFixed(0)}%` : formatDate
              }
              ticks={activeTab === "interest-curve" ? [0, 0.2, 0.4, 0.6, 0.8, 1.0] : undefined}
              interval={activeTab === "interest-curve" ? 0 : "preserveStartEnd"}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              minTickGap={50}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis
              tickFormatter={(value) => {
                if (activeTab === "tvl" && showUSD) {
                  return `$${dynamicNumeralFormatter(value)}`;
                } else if (activeTab === "rates" || activeTab === "interest-curve") {
                  return `${value.toFixed(2)}%`;
                } else {
                  return dynamicNumeralFormatter(value);
                }
              }}
              width={60}
              axisLine={false}
              tickLine={false}
              domain={chartOptions.domain}
              label={{
                value: chartOptions.yAxisLabel,
                angle: -90,
                position: "insideLeft",
                style: { fill: "var(#fffff)" },
              }}
            />
            <ChartTooltip cursor={false} content={<CustomTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} className="mt-6" />
            <defs>
              <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Only render areas if there's no error */}
            {!hasError &&
              (() => {
                switch (activeTab) {
                  case "tvl":
                    return (
                      <>
                        <Area
                          dataKey="displayTotalDeposits"
                          type="monotone"
                          fill="url(#fillPrimary)"
                          fillOpacity={0.4}
                          stroke={chartColors.primary}
                          strokeWidth={2}
                          name="Total Deposits"
                        />
                        <Area
                          dataKey="displayTotalBorrows"
                          type="monotone"
                          fill="url(#fillSecondary)"
                          fillOpacity={0.4}
                          stroke={chartColors.secondary}
                          strokeWidth={2}
                          name="Total Borrows"
                        />
                      </>
                    );
                  case "rates":
                    return (
                      <>
                        <Area
                          dataKey="depositRate"
                          type="monotone"
                          fill="url(#fillPrimary)"
                          fillOpacity={0.4}
                          stroke={chartColors.primary}
                          strokeWidth={2}
                          name="Deposit Rate"
                        />
                        <Area
                          dataKey="borrowRate"
                          type="monotone"
                          fill="url(#fillSecondary)"
                          fillOpacity={0.4}
                          stroke={chartColors.secondary}
                          strokeWidth={2}
                          name="Borrow Rate"
                        />
                      </>
                    );
                  case "interest-curve": {
                    return (
                      <>
                        <Area
                          dataKey="borrowAPY"
                          data={interestCurveData}
                          type="monotone"
                          fill="url(#fillPrimary)"
                          stroke={chartColors.secondary}
                          strokeWidth={2}
                          name="Borrow APY"
                        />
                        <Area
                          dataKey="supplyAPY"
                          data={interestCurveData}
                          type="monotone"
                          fill="url(#fillSecondary)"
                          stroke={chartColors.primary}
                          strokeWidth={2}
                          name="Supply APY"
                        />
                        <ReferenceLine
                          x={currentUtilizationRateDecimal}
                          stroke="#ffffff"
                          strokeDasharray="3 3"
                          label={{
                            value: `Current utilization: ${(currentUtilizationRateDecimal * 100).toFixed(1)}%`,
                            position: "top",
                            fill: "#ffffff",
                            fontSize: 12,
                          }}
                        />
                      </>
                    );
                  }

                  default:
                    return null;
                }
              })()}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export { BankChart };
