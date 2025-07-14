"use client";

import React from "react";
import Image from "next/image";
import BigNumber from "bignumber.js";

import { computeMaxLeverage, EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { numeralFormatter, percentFormatterMod } from "@mrgnlabs/mrgn-common";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { IconEmodeSimple } from "~/components/ui/icons";
import { getAssetWeightData } from "~/bank-data.utils";
import { EmodeDiff } from "./emode-diff";
import { cn } from "~/theme";
import { useWallet } from "~/components";
import {
  groupLiabilityBanksByCollateralBank,
  groupCollateralBanksByLiabilityBank,
  useEmode,
  useExtendedBanks,
} from "@mrgnlabs/mrgn-state";

interface EmodeTableProps {
  initialBank?: ExtendedBankInfo;
  align?: "center" | "left";
  className?: string;
  showTag?: boolean;
  resetKey?: number;
}

const EmodeTable = ({ initialBank, align = "center", className, showTag = true, resetKey = 0 }: EmodeTableProps) => {
  const { extendedBanks } = useExtendedBanks();
  const { emodePairs } = useEmode();
  const [selectedSide, setSelectedSide] = React.useState<"lend" | "borrow">("borrow");
  const [selectedBank, setSelectedBank] = React.useState<ExtendedBankInfo | undefined>(initialBank);

  const [collateralBanksByLiabilityBank, liabilityBanksByCollateralBank] = React.useMemo(() => {
    return [
      groupCollateralBanksByLiabilityBank(extendedBanks, emodePairs),
      groupLiabilityBanksByCollateralBank(extendedBanks, emodePairs),
    ];
  }, [extendedBanks, emodePairs]);

  React.useEffect(() => {
    setSelectedBank(initialBank);
  }, [resetKey, initialBank]);

  const emodeBanks = React.useMemo(() => {
    return Array.from(
      new Set(
        emodePairs
          .map((pair) => extendedBanks.find((bank) => bank.address.toBase58() === pair.liabilityBank.toString()))
          .filter((bank) => bank !== undefined)
      )
    );
  }, [emodePairs, extendedBanks]);

  const banksAndPairs = React.useMemo(() => {
    if (!selectedBank) return [];
    const banks = (
      selectedSide === "lend"
        ? // emode banks which can be used as collateral for the selected liability bank
          liabilityBanksByCollateralBank[selectedBank.address.toBase58()] || []
        : // emode banks which can be used as liability for the selected collateral bank
          collateralBanksByLiabilityBank[selectedBank.address.toBase58()] || []
    ).map((bank) => ({
      bank: "collateralBank" in bank ? bank.collateralBank : bank.liabilityBank,
      pair: bank.emodePair,
    }));
    return [...banks].sort((a, b) => b.pair.assetWeightInit.toNumber() - a.pair.assetWeightInit.toNumber());
  }, [selectedBank, selectedSide, liabilityBanksByCollateralBank, collateralBanksByLiabilityBank]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn("flex items-center justify-center gap-3 text-lg", align === "left" && "justify-start")}>
        <p>I would like to</p>
        <Select
          value={selectedSide}
          onValueChange={(value) => {
            setSelectedSide(value as "lend" | "borrow");
          }}
        >
          <SelectTrigger className="bg-transparent max-w-fit h-6 rounded-none px-0 text-lg">
            <p className="pr-2">{selectedSide}</p>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="lend">lend</SelectItem>
              <SelectItem value="borrow">borrow</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={selectedBank?.address.toBase58()}
          onValueChange={(value) => {
            const bank = emodeBanks.find((bank) => bank.address.toBase58() === value);
            setSelectedBank(bank);
          }}
        >
          <SelectTrigger className="bg-transparent max-w-fit h-6 rounded-none px-0 text-lg">
            <p className={cn("pr-2", !selectedBank && "border-b border-foreground/30")}>
              {selectedBank ? (
                <div className="flex items-center gap-2 text-base">
                  <Image
                    src={selectedBank.meta.tokenLogoUri}
                    alt={selectedBank.meta.tokenSymbol}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  {selectedBank.meta.tokenSymbol}
                </div>
              ) : (
                <p>select a bank</p>
              )}
            </p>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {emodeBanks.map((bank) => (
                <SelectItem key={bank.address.toBase58()} value={bank.address.toBase58()}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={bank.meta.tokenLogoUri}
                      alt={bank.meta.tokenSymbol}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    {bank.meta.tokenSymbol}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>{" "}
      </div>
      {selectedBank && (
        <Table className="w-full mt-1">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/5">{selectedSide === "lend" ? "Borrow" : "Lend"}</TableHead>
              {showTag && <TableHead className="w-1/5 hidden md:table-cell">Tag</TableHead>}
              <TableHead className="w-1/5">Weight</TableHead>
              <TableHead className="w-1/5">
                <div className="flex items-center gap-1">
                  <IconEmodeSimple size={20} className="-ml-1.5" />
                  e-mode
                </div>
              </TableHead>
              <TableHead className="w-1/5">Max Leverage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banksAndPairs.map((bankAndPair) => {
              if (!bankAndPair) return null;

              const emodePair = bankAndPair.pair;
              const bank = bankAndPair.bank;
              const bankWeight = selectedSide === "lend" ? selectedBank : bank;
              const { assetWeight, originalAssetWeight } = getAssetWeightData(bankWeight, true);
              const { maxLeverage } = computeMaxLeverage(bank.info.rawBank, selectedBank.info.rawBank, {
                assetWeightInit: BigNumber.max(emodePair.assetWeightInit, bank.info.rawBank.config.assetWeightInit),
              });
              return (
                <TableRow
                  key={bank.address.toBase58()}
                  className="odd:bg-background-gray-light/50 hover:bg-transparent hover:odd:bg-background-gray-light/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <Image
                        src={bank.meta.tokenLogoUri}
                        alt={bank.meta.tokenSymbol}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      {bank.meta.tokenSymbol}
                    </div>
                  </TableCell>
                  {showTag && (
                    <TableCell className="hidden md:table-cell">
                      {EmodeTag[bank.info.rawBank.emode.emodeTag]
                        .replace("_", " ")
                        .toUpperCase()
                        .replace("T1", "Tier 1")
                        .replace("T2", "Tier 2")}
                    </TableCell>
                  )}
                  <TableCell>
                    {percentFormatterMod(originalAssetWeight || assetWeight, {
                      minFractionDigits: 0,
                      maxFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell>
                    <EmodeDiff
                      assetWeight={emodePair.assetWeightInit.toNumber()}
                      originalAssetWeight={originalAssetWeight || assetWeight}
                      className="text-mfi-emode"
                      diffClassName="text-foreground"
                    />
                  </TableCell>
                  <TableCell>{numeralFormatter(maxLeverage)}x</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export { EmodeTable };
