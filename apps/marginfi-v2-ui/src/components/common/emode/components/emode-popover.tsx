"use client";

import React from "react";

import Image from "next/image";
import { IconExternalLink } from "@tabler/icons-react";
import { EmodePair, EmodeTag } from "@mrgnlabs/marginfi-client-v2";
import { percentFormatterMod } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, getAssetWeightData } from "@mrgnlabs/mrgn-utils";

import { EmodeDiff } from "./emode-diff";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Table } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { IconEmode } from "~/components/ui/icons";

interface EmodePopoverProps {
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
}

export const EmodePopover = ({
  assetWeight,
  originalAssetWeight,
  emodeActive,
  emodeTag,
  isInLendingMode = true,
  collateralBanks,
  liabilityBanks,
  triggerType = "weight",
}: EmodePopoverProps) => {
  return (
    <Popover>
      {triggerType === "weight" ? (
        <PopoverTrigger className={cn("flex items-center gap-1", emodeActive && "text-mfi-emode")}>
          <IconEmode size={20} />
          {percentFormatterMod(assetWeight, { minFractionDigits: 0, maxFractionDigits: 2 })}{" "}
          <IconExternalLink size={12} className={cn(emodeActive && "text-mfi-emode")} />
        </PopoverTrigger>
      ) : (
        <PopoverTrigger className="flex items-center gap-1">
          <Badge variant="emode" className={cn("pr-2.5", !emodeActive && "text-foreground")}>
            <IconEmode size={18} /> {emodeTag}
          </Badge>
        </PopoverTrigger>
      )}
      <PopoverContent className="w-auto text-xs md:py-3 md:px-4" side="top">
        {isInLendingMode && emodeActive && originalAssetWeight ? (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1 items-center">
              <IconEmode size={18} /> <p>e-mode weights active</p>
            </div>
            <EmodeDiff assetWeight={assetWeight} originalAssetWeight={originalAssetWeight} className="text-center" />
          </div>
        ) : isInLendingMode && liabilityBanks ? (
          <div className="flex flex-col gap-4">
            <p className="w-4/5">e-mode pairings available when borrowing from the following banks:</p>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-6">Bank</TableHead>
                  <TableHead className="h-6">Tag</TableHead>
                  <TableHead className="h-6">Weight</TableHead>
                  <TableHead className="h-6">
                    <div className="flex items-center gap-1">
                      <IconEmode size={18} className="-ml-1.5" />
                      e-mode
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liabilityBanks?.map((liabilityBankItem) => {
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
                      <TableCell className="py-1 lowercase">
                        {EmodeTag[liabilityBankItem.emodePair.liabilityBankTag]}
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
        ) : !isInLendingMode && collateralBanks ? (
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
                      <IconEmode size={12} />
                      e-mode
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collateralBanks?.map((collateralBankItem) => {
                  const { assetWeight: collateralAssetWeight } = getAssetWeightData(
                    collateralBankItem.collateralBank,
                    true
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
                      <TableCell className="py-1 lowercase">
                        {EmodeTag[collateralBankItem.emodePair.collateralBankTag]}
                      </TableCell>
                      <TableCell className="py-1">
                        {percentFormatterMod(collateralAssetWeight || 0, {
                          minFractionDigits: 0,
                          maxFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="py-1">
                        <EmodeDiff
                          assetWeight={collateralBankItem.emodePair.assetWeightInit.toNumber()}
                          originalAssetWeight={collateralAssetWeight}
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
