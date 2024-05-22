"use client";

import React from "react";

import capitalize from "lodash/capitalize";

import { cn } from "~/lib/utils";

import { TokenCombobox } from "~/components/token-combobox";

import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconPyth } from "~/components/ui/icons";
import { Slider } from "~/components/ui/slider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type TradeSide = "long" | "short";

export const Trade = () => {
  const [tradeState, setTradeState] = React.useState<TradeSide>("long");
  const [selectedPool, setSelectedPool] = React.useState<number>(0);
  const [amount, setAmount] = React.useState<number>(0);
  const [leverage, setLeverage] = React.useState(1);

  const fullAmount = React.useMemo(() => {
    if (amount === null) return null;
    return amount * leverage;
  }, [amount, leverage]);

  return (
    <Card className="bg-mrgn-gray border-none">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <ToggleGroup
            type="single"
            className="w-full gap-4"
            defaultValue="long"
            onValueChange={(value) => setTradeState(value as TradeSide)}
          >
            <ToggleGroupItem
              className="w-full border border-border hover:bg-accent hover:text-primary data-[state=on]:bg-accent data-[state=on]:border-transparent"
              value="long"
              aria-label="Toggle long"
            >
              Long
            </ToggleGroupItem>
            <ToggleGroupItem
              className="w-full border border-border hover:bg-accent hover:text-primary data-[state=on]:bg-accent data-[state=on]:border-transparent"
              value="short"
              aria-label="Toggle short"
            >
              Short
            </ToggleGroupItem>
          </ToggleGroup>
          <div>
            <div className="flex items-center justify-between">
              <Label>Amount</Label>
              <Button size="sm" variant="link" className="no-underline hover:underline">
                Max
              </Button>
            </div>
            <div className="relative flex gap-4 items-center border border-border p-2 rounded-lg">
              <TokenCombobox selected={selectedPool} setSelected={setSelectedPool} />
              <Input
                type="number"
                value={amount}
                onChange={(e) => (e.currentTarget ? setAmount(Number(e.currentTarget.value)) : setAmount(0))}
                className="appearance-none border-none text-right focus-visible:ring-0 focus-visible:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Size of {tradeState}</Label>
            <div className="relative">
              <Input type="number" value={fullAmount || ""} disabled className="disabled:opacity-100" />
              {selectedPool !== null && (
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  $POOL{selectedPool + 1}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Leverage</Label>
              <span className="text-sm font-medium text-muted-foreground">{leverage}x</span>
            </div>
            <Slider
              className="w-full"
              min={1}
              max={10}
              step={1}
              value={[leverage]}
              onValueChange={(value) => setLeverage(value[0])}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-8">
        <div className="space-y-1 w-full">
          <Button
            className={cn(
              "w-full",
              tradeState === "long" && "bg-mrgn-success",
              tradeState === "short" && "bg-mrgn-error"
            )}
          >
            {capitalize(tradeState)} {selectedPool !== null ? `Pool ${selectedPool + 1}` : "Pool"}
          </Button>
          <Button variant="link" size="sm" className="w-full">
            Desposit Collateral
          </Button>
        </div>
        <dl className="w-full grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
          <dt>Entry Price</dt>
          <dd className="text-primary text-right">$177.78</dd>
          <dt>Liquidation Price</dt>
          <dd className="text-primary text-right">$166.67</dd>
          <dt>Oracle</dt>
          <dd className="text-primary flex items-center gap-1 ml-auto">
            Pyth <IconPyth size={14} />
          </dd>
          <dt>Available Liquidity</dt>
          <dd className="text-primary text-right">$1,000,000</dd>
        </dl>
      </CardFooter>
    </Card>
  );
};
