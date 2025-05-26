import React from "react";
import Image from "next/image";

import { IconSearch } from "@tabler/icons-react";
import { computeMaxLeverage, EmodeTag, MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, percentFormatterMod } from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore } from "~/store";
import { Button } from "~/components/ui/button";
import { IconEmode } from "~/components/ui/icons";
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
import BigNumber from "bignumber.js";

interface EmodeExploreProps {
  trigger?: React.ReactNode;
  initialBank?: ExtendedBankInfo;
  emodeTag?: EmodeTag;
}

const EmodeExplore = ({ trigger, initialBank, emodeTag }: EmodeExploreProps) => {
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
    return selectedBank ? collateralBanksByLiabilityBank[selectedBank.address.toBase58()] : [];
  }, [selectedBank, collateralBanksByLiabilityBank]);

  React.useEffect(() => {
    if (emodeBanks.length === 1) {
      setSelectedBank(emodeBanks[0]);
    }
  }, [emodeBanks]);

  const defaultTrigger = (
    <Button variant="outline" className="w-full bg-background-gray text-xs font-normal hover:bg-background-gray-light">
      <IconSearch size={12} />
      Explore e-mode pairs
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent
        className="overflow-visible p-2 md:p-6 md:py-8 md:max-w-2xl"
        closeClassName="md:-top-8 md:-right-8 md:z-50"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-normal flex items-center gap-2">
            Explore{" "}
            <div className="flex items-center gap-1">
              <IconEmode size={32} />
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
                <TableHead className="w-1/5">Collateral</TableHead>
                <TableHead className="w-1/5">Tag</TableHead>
                <TableHead className="w-1/5">Weight</TableHead>
                <TableHead className="w-1/5">
                  <div className="flex items-center gap-1">
                    <IconEmode size={20} className="-ml-1.5" />
                    e-mode
                  </div>
                </TableHead>
                <TableHead className="w-1/5">Max Leverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collateralBanks.map((collateralBank) => {
                const emodePair = collateralBank.emodePair;
                const { assetWeight, originalAssetWeight } = getAssetWeightData(collateralBank.collateralBank, true);
                const { maxLeverage } = computeMaxLeverage(
                  collateralBank.collateralBank.info.rawBank,
                  selectedBank.info.rawBank,
                  {
                    assetWeightInit: BigNumber.max(
                      emodePair.assetWeightInit,
                      collateralBank.collateralBank.info.rawBank.config.assetWeightInit
                    ),
                  }
                );
                return (
                  <TableRow
                    key={collateralBank.collateralBank.address.toBase58()}
                    className="odd:bg-background-gray-light/50 hover:bg-transparent hover:odd:bg-background-gray-light/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs md:text-sm">
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
                    <TableCell className="lowercase">{EmodeTag[emodePair.collateralBankTag]}</TableCell>
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
      </DialogContent>
    </Dialog>
  );
};

export { EmodeExplore };
