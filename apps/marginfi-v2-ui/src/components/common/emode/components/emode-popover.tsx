"use client";

import React from "react";

import Image from "next/image";
import { IconBolt, IconExternalLink } from "@tabler/icons-react";
import { percentFormatterMod } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Table } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";

interface EmodePopoverProps {
  assetWeight: number;
  originalAssetWeight?: number;
  emodeActive?: boolean;
  emodeTag?: string;
  isInLendingMode?: boolean;
  collateralBanks?: any[];
  liabilityBanks?: any[];
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
        <PopoverTrigger className={cn("flex items-center gap-1", emodeActive && "text-purple-300")}>
          <IconBolt size={12} className={cn(emodeActive && "text-purple-300")} />
          {percentFormatterMod(assetWeight, { minFractionDigits: 0, maxFractionDigits: 2 })}{" "}
          <IconExternalLink size={12} className={cn(emodeActive && "text-purple-300")} />
        </PopoverTrigger>
      ) : (
        <PopoverTrigger className={cn("flex items-center gap-1", emodeActive && "text-purple-300")}>
          <Badge variant="emode" className={cn(!emodeActive && "text-foreground")}>
            <IconBolt size={14} /> {emodeTag}
          </Badge>
        </PopoverTrigger>
      )}
      <PopoverContent className="w-auto text-xs" side="top">
        {isInLendingMode && emodeActive && originalAssetWeight ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center">
              <IconBolt size={12} className="text-purple-300 translate-y-px" /> <p>e-mode weights active</p>
            </div>
            <p className="text-center">
              {percentFormatterMod(assetWeight, { minFractionDigits: 0, maxFractionDigits: 2 })}{" "}
              <span className="text-muted-foreground text-xs">
                (+
                {percentFormatterMod(assetWeight - originalAssetWeight, {
                  minFractionDigits: 0,
                  maxFractionDigits: 2,
                })}
                )
              </span>
            </p>
          </div>
        ) : isInLendingMode && liabilityBanks ? (
          <div className="flex flex-col gap-4">
            <p className="w-4/5">e-mode pairings available when borrowing from the following banks:</p>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-6">Bank</TableHead>
                  <TableHead className="h-6">Tag</TableHead>
                  <TableHead className="h-6">Init</TableHead>
                  <TableHead className="h-6">Maint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liabilityBanks?.map((liabilityBankItem) => (
                  <TableRow className="text-xs">
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
                      {percentFormatterMod(liabilityBankItem.emodePair.assetWeightInt.toNumber(), {
                        minFractionDigits: 0,
                        maxFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="py-1">
                      {percentFormatterMod(liabilityBankItem.emodePair.assetWeightMaint.toNumber(), {
                        minFractionDigits: 0,
                        maxFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
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
                  <TableHead className="h-6">Init</TableHead>
                  <TableHead className="h-6">Maint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collateralBanks?.map((collateralBankItem) => (
                  <TableRow className="text-xs">
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
                      {percentFormatterMod(collateralBankItem.emodePair.assetWeightInt.toNumber(), {
                        minFractionDigits: 0,
                        maxFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="py-1">
                      {percentFormatterMod(collateralBankItem.emodePair.assetWeightMaint.toNumber(), {
                        minFractionDigits: 0,
                        maxFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
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
