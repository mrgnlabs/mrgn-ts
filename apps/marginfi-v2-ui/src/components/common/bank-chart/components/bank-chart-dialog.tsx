"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { BankChart } from "../bank-chart";
import { IconChartLine } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";

type BankChartDialogProps = {
  bankAddress: string;
  trigger?: React.ReactNode;
};

const BankChartDialog = ({ bankAddress, trigger }: BankChartDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <IconChartLine size={18} className="text-muted-foreground" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Bank Rate History</DialogTitle>
        </DialogHeader>
        <BankChart bankAddress={bankAddress} />
      </DialogContent>
    </Dialog>
  );
};

export { BankChartDialog };
