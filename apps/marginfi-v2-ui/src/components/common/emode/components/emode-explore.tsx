import React from "react";
import Image from "next/image";

import { IconBolt, IconSearch } from "@tabler/icons-react";
import { EmodeTag, MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatterMod } from "@mrgnlabs/mrgn-common";

import { cn } from "~/theme";
import { useMrgnlendStore } from "~/store";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Label } from "~/components/ui/label";
import Link from "next/link";
import { getAssetWeightData } from "~/bank-data.utils";
import { EmodeDiff } from "./emode-diff";

interface EmodeViewAllProps {
  trigger?: React.ReactNode;
  initialBank?: ExtendedBankInfo;
  emodeTag?: EmodeTag;
}

const EmodeViewAll = ({ trigger, initialBank, emodeTag }: EmodeViewAllProps) => {
  const [extendedBankInfos, emodePairs, collateralBanksByLiabilityBank] = useMrgnlendStore((state) => [
    state.extendedBankInfos,
    state.emodePairs,
    state.collateralBanksByLiabilityBank,
  ]);
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
    return collateralBanksByLiabilityBank[selectedBank?.address.toBase58() as string];
  }, [selectedBank, collateralBanksByLiabilityBank]);

  React.useEffect(() => {
    if (emodeBanks.length === 1) {
      setSelectedBank(emodeBanks[0]);
    }
  }, [emodeBanks]);

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="w-full bg-background-gray h-auto py-1.5 text-xs font-normal hover:bg-background-gray-light"
    >
      <IconSearch size={12} />
      Explore e-mode
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="overflow-visible md:p-6 md:py-8" closeClassName="-top-8 -right-8 z-50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-normal flex items-center gap-2">
            Explore{" "}
            <div className="flex items-center gap-1">
              <IconBolt size={18} />
              e-mode
            </div>
            {emodeTag && <span className="lowercase"> {EmodeTag[emodeTag]}</span>}
            parings
          </DialogTitle>
          <DialogDescription className="text-sm">
            View e-mode {emodeTag && <span className="lowercase"> {EmodeTag[emodeTag]}</span>} group and the boosted
            banks.
            <br />
            For more information on e-mode{" "}
            <Link
              href="https://docs.marginfi.app"
              target="_blank"
              rel="noreferrer"
              className="border-b border-foreground/50"
            >
              read the docs
            </Link>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 w-full flex flex-col gap-2 justify-center items-center max-w-xs mx-auto">
          <Label className="text-muted-foreground">I would like to borrow:</Label>
          <Select
            value={selectedBank?.address.toBase58()}
            onValueChange={(value) => {
              const bank = emodeBanks.find((bank) => bank.address.toBase58() === value);
              setSelectedBank(bank);
            }}
          >
            <SelectTrigger className="w-full flex">
              <SelectValue placeholder="Select a bank" />
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
          </Select>
        </div>
        {selectedBank && (
          <Table className="w-full mt-1">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Collateral</TableHead>
                <TableHead className="w-1/4">Tag</TableHead>
                <TableHead className="w-1/4">Weight</TableHead>
                <TableHead className="w-1/4">
                  <div className="flex items-center gap-1 ">
                    <IconBolt size={14} className="translate-y-px" />
                    e-mode
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collateralBanks?.map((collateralBank) => {
                const { assetWeight, originalAssetWeight } = getAssetWeightData(collateralBank.collateralBank, true);
                return (
                  <TableRow
                    key={collateralBank.collateralBank.address.toBase58()}
                    className="odd:bg-background-gray-light/50 hover:bg-transparent hover:odd:bg-background-gray-light/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Image
                          src={collateralBank.collateralBank.meta.tokenLogoUri}
                          alt={collateralBank.collateralBank.meta.tokenSymbol}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                        {collateralBank.collateralBank.meta.tokenSymbol}
                      </div>
                    </TableCell>
                    <TableCell className="lowercase">{EmodeTag[collateralBank.emodePair.collateralBankTag]}</TableCell>
                    <TableCell>
                      {percentFormatterMod(originalAssetWeight || assetWeight, {
                        minFractionDigits: 0,
                        maxFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <EmodeDiff
                        assetWeight={collateralBank.emodePair.assetWeightInt.toNumber()}
                        originalAssetWeight={originalAssetWeight || assetWeight}
                        className="text-purple-300"
                        diffClassName="text-foreground"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { EmodeViewAll };
