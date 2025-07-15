"use client";

import React from "react";

import Image from "next/image";
import { IconInfoCircle } from "@tabler/icons-react";
import { EmodePair, EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { percentFormatterMod } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { cn, getAssetWeightData, getEmodeStrategies } from "@mrgnlabs/mrgn-utils";
import { useDebounce } from "@uidotdev/usehooks";

import { EmodeDiff } from "./emode-diff";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Table } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { IconEmodeSimple, IconEmodeSimpleInactive } from "~/components/ui/icons";

interface EmodePopoverProps {
  bank: ExtendedBankInfo;
  extendedBanks: ExtendedBankInfo[];
  assetWeight: number;
  originalAssetWeight?: number;
  emodeActive?: boolean;
  emodeTag?: string;
  isInLendingMode?: boolean;
  collateralBanks?: {
    collateralBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[];
  liabilityBanks?: {
    liabilityBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[];
  triggerType?: "weight" | "tag";
  showActiveOnly?: boolean;
  iconSize?: "base" | "lg";
}

export const EmodePopover = ({
  bank,
  extendedBanks,
  assetWeight,
  originalAssetWeight,
  emodeActive,
  emodeTag,
  isInLendingMode = true,
  collateralBanks,
  liabilityBanks,
  triggerType = "weight",
  showActiveOnly = false,
  iconSize = "base",
}: EmodePopoverProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [shouldClose, setShouldClose] = React.useState(false);
  const debouncedShouldClose = useDebounce(shouldClose, 300);

  React.useEffect(() => {
    if (debouncedShouldClose) {
      setIsOpen(false);
      setShouldClose(false);
    }
  }, [debouncedShouldClose]);

  const handleMouseEnter = React.useCallback(() => {
    setShouldClose(false);
    setIsOpen(true);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setShouldClose(true);
  }, []);

  const filteredLiabilityBanks = React.useMemo(() => {
    if (!liabilityBanks) return [];
    const filtered = !showActiveOnly
      ? liabilityBanks
      : liabilityBanks.filter(
          (item) =>
            item.liabilityBank.isActive &&
            item.liabilityBank.position.isLending &&
            item.liabilityBank.position.emodeActive
        );
    return [...filtered].sort(
      (a, b) => b.emodePair.assetWeightInit.toNumber() - a.emodePair.assetWeightInit.toNumber()
    );
  }, [liabilityBanks, showActiveOnly]);

  const filteredCollateralBanks = React.useMemo(() => {
    if (!collateralBanks) return [];
    const filtered = !showActiveOnly
      ? collateralBanks
      : collateralBanks.filter(
          (item) =>
            item.collateralBank.isActive &&
            item.collateralBank.position.isLending &&
            item.collateralBank.position.emodeActive
        );
    return [...filtered].sort(
      (a, b) => b.emodePair.assetWeightInit.toNumber() - a.emodePair.assetWeightInit.toNumber()
    );
  }, [collateralBanks, showActiveOnly]);

  const isAvailableForEmode = React.useMemo(() => {
    if (isInLendingMode) {
      const { activateSupplyEmodeBanks, increaseSupplyEmodeBanks, extendSupplyEmodeBanks } = getEmodeStrategies([
        ...extendedBanks,
      ]);

      return !![...activateSupplyEmodeBanks, ...increaseSupplyEmodeBanks, ...extendSupplyEmodeBanks].find((b) =>
        b.address.equals(bank.address)
      );
    } else {
      const { activateBorrowEmodeBanks, extendBorrowEmodeBanks } = getEmodeStrategies([...extendedBanks]);

      return !![...activateBorrowEmodeBanks, ...extendBorrowEmodeBanks].find((b) => b.address.equals(bank.address));
    }
  }, [bank.address, isInLendingMode, extendedBanks]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {triggerType === "weight" ? (
        <PopoverTrigger
          className={cn("flex items-center", emodeActive && "text-mfi-emode")}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {emodeActive ? <IconEmodeSimple size={iconSize === "base" ? 20 : 28} /> : <></>}
          <span className="min-w-[33px] text-right mr-1.5">
            {percentFormatterMod(assetWeight, { minFractionDigits: 0, maxFractionDigits: 2 })}
          </span>
          <IconInfoCircle size={iconSize === "base" ? 13 : 20} className={cn(emodeActive && "text-mfi-emode")} />
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          className="flex items-center gap-1"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="min-w-[33px] text-right mr-1.5">
            {emodeActive ? (
              <IconEmodeSimple size={iconSize === "base" ? 18 : 26} />
            ) : (
              <IconEmodeSimpleInactive size={iconSize === "base" ? 18 : 26} />
            )}
          </div>
        </PopoverTrigger>
      )}
      <PopoverContent
        className="w-auto text-xs md:py-3 md:px-4"
        side="top"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isInLendingMode && emodeActive && originalAssetWeight ? (
          <div className="flex flex-col gap-1 items-center">
            <div className="flex gap-1 items-center">
              <IconEmodeSimple size={18} /> <p>e-mode weights active</p>
            </div>
            <EmodeDiff assetWeight={assetWeight} originalAssetWeight={originalAssetWeight} className="text-center" />
          </div>
        ) : isInLendingMode && filteredLiabilityBanks ? (
          <div className="flex flex-col gap-4">
            <p className="w-4/5">e-mode pairings available when borrowing from the following banks:</p>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-6">Bank</TableHead>
                  <TableHead className="h-6 hidden md:table-cell">Tag</TableHead>
                  <TableHead className="h-6">Weight</TableHead>
                  <TableHead className="h-6">
                    <div className="flex items-center gap-1">
                      <IconEmodeSimple size={18} className="-ml-1.5" />
                      e-mode
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLiabilityBanks?.map((liabilityBankItem) => {
                  return (
                    <TableRow key={liabilityBankItem.liabilityBank.address.toBase58()} className="text-xs">
                      <TableCell className="py-1">
                        <div className="flex items-center gap-1.5">
                          <Image
                            src={liabilityBankItem.liabilityBank.meta.tokenLogoUri}
                            width={22}
                            height={22}
                            alt={liabilityBankItem.liabilityBank.meta.tokenSymbol}
                            className="rounded-full"
                          />
                          {liabilityBankItem.liabilityBank.meta.tokenSymbol}
                        </div>
                      </TableCell>
                      <TableCell className="py-1 hidden md:table-cell">
                        {EmodeTag[liabilityBankItem.emodePair.liabilityBankTag]
                          .replace("_", " ")
                          .toUpperCase()
                          .replace("T1", "Tier 1")
                          .replace("T2", "Tier 2")}
                      </TableCell>
                      <TableCell className="py-1">
                        {percentFormatterMod(originalAssetWeight || 0, {
                          minFractionDigits: 0,
                          maxFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="py-1">
                        <EmodeDiff
                          assetWeight={liabilityBankItem.emodePair.assetWeightInit.toNumber()}
                          originalAssetWeight={originalAssetWeight}
                          className="text-mfi-emode"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : !isInLendingMode && filteredCollateralBanks ? (
          <div className="flex flex-col gap-4">
            <p className="w-4/5">e-mode pairings available when lending to the following banks:</p>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-6">Bank</TableHead>
                  <TableHead className="h-6">Tag</TableHead>
                  <TableHead className="h-6">Weight</TableHead>
                  <TableHead className="h-6">
                    <div className="flex items-center gap-1">
                      <IconEmodeSimple size={12} />
                      e-mode
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollateralBanks?.map((collateralBankItem) => {
                  const { originalAssetWeight: collateralOriginalAssetWeight } = getAssetWeightData(
                    collateralBankItem.collateralBank,
                    true,
                    extendedBanks
                  );
                  return (
                    <TableRow key={collateralBankItem.collateralBank.address.toBase58()} className="text-xs">
                      <TableCell className="py-1">
                        <div className="flex items-center gap-1.5">
                          <Image
                            src={collateralBankItem.collateralBank.meta.tokenLogoUri}
                            width={20}
                            height={20}
                            alt={collateralBankItem.collateralBank.meta.tokenSymbol}
                            className="rounded-full"
                          />
                          {collateralBankItem.collateralBank.meta.tokenSymbol}
                        </div>
                      </TableCell>
                      <TableCell className="py-1 hidden md:table-cell">
                        {EmodeTag[collateralBankItem.emodePair.collateralBankTag].replace("_", " ").toUpperCase()}
                      </TableCell>
                      <TableCell className="py-1">
                        {percentFormatterMod(collateralOriginalAssetWeight || 0, {
                          minFractionDigits: 0,
                          maxFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="py-1">
                        <EmodeDiff
                          assetWeight={collateralBankItem.emodePair.assetWeightInit.toNumber()}
                          originalAssetWeight={collateralOriginalAssetWeight}
                          className="text-mfi-emode"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <>{(assetWeight * 100).toFixed(0) + "%"}</>
        )}
      </PopoverContent>
    </Popover>
  );
};
