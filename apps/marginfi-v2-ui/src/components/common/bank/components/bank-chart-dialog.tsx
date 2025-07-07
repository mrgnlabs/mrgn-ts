"use client";

import React from "react";
import { IconChartLine } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import Image from "next/image";
import { getTokenImageURL } from "~/mrgnUtils";

import { BankChart } from "./bank-chart";

type BankChartDialogProps = {
  bankAddress: string;
  symbol?: string;
  mintAddress?: string;
  trigger?: React.ReactNode;
  tab?: "rates" | "tvl" | "interest-curve";
};

const BankChartDialog = ({ bankAddress, symbol, trigger, mintAddress, tab = "tvl" }: BankChartDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <IconChartLine size={18} className="text-muted-foreground" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full md:max-w-4xl bg-background-gray/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mintAddress && (
              <Image
                src={getTokenImageURL(mintAddress)}
                alt={symbol || "Bank"}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            {symbol || "Bank"} <span>Historical Data</span>
          </DialogTitle>
          <DialogDescription>
            {(() => {
              switch (tab) {
                case "tvl":
                  return "Total deposits and borrows over the last 30 days.";
                case "rates":
                  return "Deposit and borrow interest rates over the last 30 days.";
                case "interest-curve":
                  return "Interest rate curve parameters over the last 30 days.";
                default:
                  return "Historical data over the last 30 days.";
              }
            })()}
          </DialogDescription>
        </DialogHeader>
        <BankChart bankAddress={bankAddress} tab={tab} />
      </DialogContent>
    </Dialog>
  );
};

export { BankChartDialog };
