"use client";

import React from "react";
import Image from "next/image";
import BigNumber from "bignumber.js";

import { computeMaxLeverage, EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, percentFormatterMod } from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore } from "~/store";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { IconEmodeSimple } from "~/components/ui/icons";
import { getAssetWeightData } from "~/bank-data.utils";
import { EmodeDiff } from "./emode-diff";
import { cn } from "~/theme";

interface EmodeTableProps {
  initialBank?: ExtendedBankInfo;
  emodeTag?: EmodeTag;
  align?: "center" | "left";
  className?: string;
  showTag?: boolean;
}

const EmodeTable = ({ initialBank, emodeTag, align = "center", className, showTag = true }: EmodeTableProps) => {
  const [extendedBankInfos, emodePairs, collateralBanksByLiabilityBank, liabilityBanksByCollateralBank] =
    useMrgnlendStore((state) => [
      state.extendedBankInfos,
      state.emodePairs,
      state.collateralBanksByLiabilityBank,
      state.liabilityBanksByCollateralBank,
    ]);
  const [selectedSide, setSelectedSide] = React.useState<"lend" | "borrow">("borrow");
  const [selectedBank, setSelectedBank] = React.useState<ExtendedBankInfo | undefined>(initialBank);

  const emodeBanks = React.useMemo(() => {
    return Array.from(
      new Set(
        emodePairs
          .filter((pair) => (emodeTag ? pair.liabilityBankTag === emodeTag : true))
          .map((pair) => extendedBankInfos.find((bank) => bank.address.toBase58() === pair.liabilityBank.toString()))
          .filter((bank) => bank !== undefined)
      )
    );
  }, [emodePairs, extendedBankInfos, emodeTag]);

  const collateralBanks = React.useMemo(() => {
    return selectedBank ? collateralBanksByLiabilityBank[selectedBank.address.toBase58()] : [];
  }, [selectedBank, collateralBanksByLiabilityBank]);

  const liabilityBanks = React.useMemo(() => {
    return selectedBank ? liabilityBanksByCollateralBank[selectedBank.address.toBase58()] : [];
  }, [selectedBank, liabilityBanksByCollateralBank]);

  const banks = React.useMemo(() => {
    const banks = selectedSide === "lend" ? collateralBanks : liabilityBanks;
    return banks.sort((a, b) => {
      const aWeight = a.emodePair.assetWeightInit.toNumber();
      const bWeight = b.emodePair.assetWeightInit.toNumber();
      return bWeight - aWeight;
    });
  }, [selectedSide, collateralBanks, liabilityBanks]);

  React.useEffect(() => {
    if (emodeBanks.length === 1) {
      setSelectedBank(emodeBanks[0]);
    }
  }, [emodeBanks]);

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
              {showTag && <TableHead className="w-1/5">Tag</TableHead>}
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
            {banks.map((bank) => {
              const bnk =
                selectedSide === "lend"
                  ? "collateralBank" in bank
                    ? bank.collateralBank
                    : null
                  : "liabilityBank" in bank
                    ? bank.liabilityBank
                    : null;

              if (!bnk) return null;

              const emodePair = bank.emodePair;
              const bankWeight = selectedSide === "lend" ? selectedBank : bnk;
              const { assetWeight, originalAssetWeight } = getAssetWeightData(bankWeight, true);
              const { maxLeverage } = computeMaxLeverage(bnk.info.rawBank, selectedBank.info.rawBank, {
                assetWeightInit: BigNumber.max(emodePair.assetWeightInit, bnk.info.rawBank.config.assetWeightInit),
              });
              return (
                <TableRow
                  key={bnk.address.toBase58()}
                  className="odd:bg-background-gray-light/50 hover:bg-transparent hover:odd:bg-background-gray-light/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <Image
                        src={bnk.meta.tokenLogoUri}
                        alt={bnk.meta.tokenSymbol}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      {bnk.meta.tokenSymbol}
                    </div>
                  </TableCell>
                  {showTag && (
                    <TableCell className="lowercase">
                      {EmodeTag[emodePair.collateralBankTag || emodePair.liabilityBankTag]}
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
