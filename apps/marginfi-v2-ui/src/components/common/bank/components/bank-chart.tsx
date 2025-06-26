"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { IconLoader2 } from "@tabler/icons-react";

import { useBankChart } from "../hooks/use-bank-chart.hook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Switch } from "~/components/ui/switch";
import { dynamicNumeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";
import { useIsMobile } from "@mrgnlabs/mrgn-utils";
import { useMrgnlendStore } from "~/store";

// Use the same colors for both charts
const chartColors = {
  primary: "hsl(var(--mrgn-success))",
  secondary: "hsl(var(--mrgn-warning))",
} as const;

const ratesChartConfig: ChartConfig = {
  depositRate: {
    label: "Deposit Rate",
    color: chartColors.primary,
  },
  borrowRate: {
    label: "Borrow Rate",
    color: chartColors.secondary,
  },
};

const interestCurveConfig: ChartConfig = {
  borrowAPY: {
    label: "Borrow APY",
    color: chartColors.primary,
  },
  supplyAPY: {
    label: "Supply APY",
    color: chartColors.secondary,
  },
};

const priceChartConfig: ChartConfig = {
  usdPrice: {
    label: "USD Price",
    color: chartColors.primary,
  },
};

const tvlChartConfig: ChartConfig = {
  displayTotalDeposits: {
    label: "Total Deposits",
    color: chartColors.primary,
  },
  displayTotalBorrows: {
    label: "Total Borrows",
    color: chartColors.secondary,
  },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

type BankChartProps = {
  bankAddress: string;
  tab?: "rates" | "tvl" | "interest-curve" | "price";
};

const BankChart = ({ bankAddress, tab = "tvl" }: BankChartProps) => {
  const [activeTab, setActiveTab] = React.useState<"tvl" | "rates" | "interest-curve" | "price">(tab);
  const [showUSD, setShowUSD] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (activeTab !== "tvl") {
      setShowUSD(false);
    }
  }, [activeTab]);

  // Get bank data from store
  const [extendedBankInfos] = useMrgnlendStore((state) => [state.extendedBankInfos]);
  const bank = React.useMemo(() => {
    return extendedBankInfos.find((bank) => bank.address.toBase58() === bankAddress);
  }, [extendedBankInfos, bankAddress]);
  
  // Get the current utilization rate from the bank state
  const currentUtilizationRate = React.useMemo(() => {
    if (!bank) return 0;
    return bank.info.state.utilizationRate / 100; // Convert from percentage to decimal
  }, [bank]);

  const { data, error, isLoading } = useBankChart(bankAddress, bank);

  if (isLoading) {
    return (
      <Skeleton className="bg-muted/50 w-[100%] h-[435px] mx-auto flex flex-col gap-2 items-center justify-center text-muted-foreground">
        <IconLoader2 size={16} className="animate-spin" />
        <p>Loading chart...</p>
      </Skeleton>
    );
  }

  // Select the appropriate chart config based on active tab
  const chartConfig = (() => {
    switch (activeTab) {
      case "tvl":
        return tvlChartConfig;
      case "rates":
        return ratesChartConfig;
      case "interest-curve":
        return interestCurveConfig;
      case "price":
        return priceChartConfig;
      default:
        return tvlChartConfig;
    }
  })();

  // Define chart display options based on active tab
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
          yAxisLabel: "%",
          tooltipLabel: "%",
          domain: [0, "auto"] as [number, "auto"],
        };
      case "interest-curve":
        return {
          yAxisLabel: "%",
          tooltipLabel: "%",
          domain: [0, 1] as [number, number],
        };
      case "price":
        return {
          yAxisLabel: "USD",
          tooltipLabel: "USD",
          domain: [0, "auto"] as [number, "auto"],
        };
      default:
        return {
          yAxisLabel: "",
          tooltipLabel: "",
          domain: [0, "auto"] as [number, "auto"],
        };
    }
  })();

  // Handle error or no data states by creating empty data structure for chart rendering
  const hasError = Boolean(error) || !data || data.length === 0;
  const errorMessage = error ? error.message : "No data available";

  // Create empty data for chart rendering when there's an error or no data
  // Generate several data points across a month to establish proper axis ranges
  const now = new Date();
  const emptyData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (29 - i));
    return {
      timestamp: date.toISOString(),
      depositRate: 0,
      borrowRate: 0,
      totalDeposits: 0,
      totalBorrows: 0,
      totalDepositsUsd: 0,
      totalBorrowsUsd: 0,
      displayTotalDeposits: 0,
      displayTotalBorrows: 0,
      formattedBorrowRate: "0%",
      formattedDepositRate: "0%",
      formattedTotalBorrows: "0",
      formattedTotalDeposits: "0",
      baseRate: 0,
      plateauInterestRate: 0,
      maxInterestRate: 0,
      utilization: 0,
      usdPrice: 0,
      formattedBaseRate: "0%",
      formattedPlateauRate: "0%",
      formattedMaxRate: "0%",
      formattedUtilization: "0%",
      formattedUsdPrice: "$0",
    };
  });

  // Transform the data to include formatted values (use empty data if error)
  const formattedData = hasError
    ? emptyData
    : data.map((item) => {
        // Ensure all values are numbers and not undefined
        const baseRate = typeof item.baseRate === "number" ? item.baseRate : 0;
        const plateauInterestRate = typeof item.plateauInterestRate === "number" ? item.plateauInterestRate : 0;
        const maxInterestRate = typeof item.maxInterestRate === "number" ? item.maxInterestRate : 0;
        const utilization = typeof item.utilization === "number" ? item.utilization : 0;
        const usdPrice = typeof item.usdPrice === "number" ? item.usdPrice : 0;

        console.log(usdPrice);

        // For interest curve, generate synthetic data if real data is missing
        // This is a temporary solution until the database has real data
        const syntheticBaseRate = baseRate || 0.02; // 2%
        const syntheticPlateauRate = plateauInterestRate || 0.1; // 10%
        const syntheticMaxRate = maxInterestRate || 0.3; // 30%
        const syntheticUtilization = utilization || 0.75; // 75%

        // Return formatted data
        return {
          ...item,
          // Format values for all chart types
          formattedBorrowRate: percentFormatter.format(item.borrowRate),
          formattedDepositRate: percentFormatter.format(item.depositRate),
          formattedTotalBorrows: dynamicNumeralFormatter(showUSD ? item.totalBorrowsUsd || 0 : item.totalBorrows),
          formattedTotalDeposits: dynamicNumeralFormatter(showUSD ? item.totalDepositsUsd || 0 : item.totalDeposits),
          // Use USD or native amounts for chart display
          displayTotalBorrows: showUSD ? item.totalBorrowsUsd || 0 : item.totalBorrows,
          displayTotalDeposits: showUSD ? item.totalDepositsUsd || 0 : item.totalDeposits,
          // Format values for interest curve and price charts - use synthetic data if needed
          baseRate: baseRate || syntheticBaseRate,
          plateauInterestRate: plateauInterestRate || syntheticPlateauRate,
          maxInterestRate: maxInterestRate || syntheticMaxRate,
          utilization: utilization || syntheticUtilization,
          usdPrice: usdPrice,
          formattedBaseRate: percentFormatter.format(baseRate || syntheticBaseRate),
          formattedPlateauRate: percentFormatter.format(plateauInterestRate || syntheticPlateauRate),
          formattedMaxRate: percentFormatter.format(maxInterestRate || syntheticMaxRate),
          formattedUtilization: percentFormatter.format(utilization || syntheticUtilization),
          formattedUsdPrice: `$${dynamicNumeralFormatter(usdPrice)}`,
        };
      });
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
                      return `${(entry.value * 100).toFixed(2)}%`;
                    case "price":
                      return `$${dynamicNumeralFormatter(entry.value)}`;
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

  const interestCurveData = Array.from({ length: 100 }, (_, i) => {
    const utilization = i / 100;
    const borrowAPY = utilization <= 0.8 ? 0.01 + utilization * 0.05 : 0.01 + 0.8 * 0.05 + (utilization - 0.8) * 1.0;
    const supplyAPY = borrowAPY * utilization * 0.9;
    return { utilization, borrowAPY, supplyAPY };
  });

  return (
    <Card className="bg-transparent border-none">
      <CardHeader className="sr-only">
        <CardTitle>Bank History</CardTitle>
        <CardDescription>
          Chart showing interest rates and total deposits and borrows over the last 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 rounded-lg space-y-4 relative bg-background-gray pt-8">
        <div className="absolute top-3 right-3 z-20 flex items-center gap-4">
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
            onValueChange={(value) => setActiveTab(value as "tvl" | "rates" | "interest-curve" | "price")}
            className="p-1.5 rounded-md"
            disabled={hasError}
          >
            <ToggleGroupItem
              value="tvl"
              className="text-muted-foreground font-normal h-[1.65rem] data-[state=on]:font-medium data-[state=on]:bg-mfi-action-box-accent data-[state=on]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent/50 disabled:opacity-50"
            >
              TVL
            </ToggleGroupItem>
            <ToggleGroupItem
              value="rates"
              className="text-muted-foreground font-normal h-[1.65rem] data-[state=on]:font-medium data-[state=on]:bg-mfi-action-box-accent data-[state=on]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent/50 disabled:opacity-50"
            >
              Rates
            </ToggleGroupItem>
            <ToggleGroupItem
              value="interest-curve"
              className="text-muted-foreground font-normal h-[1.65rem] data-[state=on]:font-medium data-[state=on]:bg-mfi-action-box-accent data-[state=on]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent/50 disabled:opacity-50"
            >
              IR Curve
            </ToggleGroupItem>
            <ToggleGroupItem
              value="price"
              className="text-muted-foreground font-normal h-[1.65rem] data-[state=on]:font-medium data-[state=on]:bg-mfi-action-box-accent data-[state=on]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent/50 disabled:opacity-50"
            >
              Price
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Error Overlay */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background-gray/50 rounded-lg">
            <div className="bg-background border border-border rounded-lg p-4 shadow-lg">
              <p className="text-muted-foreground text-center">{errorMessage}</p>
            </div>
          </div>
        )}

        <ChartContainer config={chartConfig} className="lg:h-[460px] w-full">
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
            />
            <YAxis
              tickFormatter={(value) => {
                if (activeTab === "tvl" && showUSD) {
                  return `$${dynamicNumeralFormatter(value)}`;
                } else if (activeTab === "rates" || activeTab === "interest-curve") {
                  return `${(value * 100).toFixed(2)}%`;
                } else if (activeTab === "price") {
                  return `$${dynamicNumeralFormatter(value)}`;
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
                style: { fill: "var(--text-muted)" },
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
                console.log("Rendering chart for tab:", activeTab);
                console.log("Sample data point:", formattedData.length > 0 ? formattedData[0] : "No data");

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
                    // Use the current utilization rate from the bank state instead of API data
                    const currentUtil = currentUtilizationRate;

                    return (
                      <>
                        <Area
                          dataKey="borrowAPY"
                          data={interestCurveData}
                          type="monotone"
                          fill="url(#fillPrimary)"
                          stroke={chartColors.primary}
                          strokeWidth={2}
                          name="Borrow APY"
                        />
                        <Area
                          dataKey="supplyAPY"
                          data={interestCurveData}
                          type="monotone"
                          fill="url(#fillSecondary)"
                          stroke={chartColors.secondary}
                          strokeWidth={2}
                          name="Supply APY"
                        />
                        <ReferenceLine
                          x={currentUtil}
                          stroke="#ffffff"
                          strokeDasharray="3 3"
                          label={{
                            value: `${(currentUtil * 100).toFixed(1)}%`,
                            position: "top",
                            fill: "#ffffff",
                            fontSize: 12,
                          }}
                        />
                      </>
                    );
                  }
                  case "price":
                    return (
                      <Area
                        dataKey="usdPrice"
                        type="monotone"
                        fill="url(#fillPrimary)"
                        fillOpacity={0.4}
                        stroke={chartColors.primary}
                        strokeWidth={2}
                        name="USD Price"
                      />
                    );
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
