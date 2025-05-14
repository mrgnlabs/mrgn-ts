import React from "react";
import Image from "next/image";

import { IconBolt, IconSearch } from "@tabler/icons-react";
import { EmodeEntry, EmodeTag } from "@mrgnlabs/marginfi-client-v2";
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

const EmodeViewAll = () => {
  const [emodePairs, groupedEmodeBanks] = useMrgnlendStore((state) => [state.emodePairs, state.groupedEmodeBanks]);
  const [selectedEmodeGroup, setSelectedEmodeGroup] = React.useState<EmodeTag>();
  const [emodeBanks, setEmodeBanks] = React.useState<ExtendedBankInfo[]>([]);
  const [selectedBank, setSelectedBank] = React.useState<ExtendedBankInfo>();
  const [emodeEntries, setEmodeEntries] = React.useState<EmodeEntry[]>([]);

  React.useEffect(() => {
    if (selectedEmodeGroup) {
      setEmodeBanks(groupedEmodeBanks[selectedEmodeGroup as unknown as keyof typeof groupedEmodeBanks]);
    }
  }, [selectedEmodeGroup, groupedEmodeBanks]);

  React.useEffect(() => {
    if (selectedBank) {
      setEmodeEntries(selectedBank.info.rawBank.emode.emodeEntries);
    }
  }, [selectedBank]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-background-gray h-auto py-1 text-xs font-normal hover:bg-background-gray-light"
        >
          <IconSearch size={12} />
          View all
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-visible md:p-6" closeClassName="-top-8 -right-8 z-50">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal">E-mode Groups</DialogTitle>
          <DialogDescription className="text-sm">
            View all e-mode groups and their associated banks.
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground">Group</Label>
            <Select
              value={selectedEmodeGroup?.toString()}
              onValueChange={(value) => {
                const emodeTag = value as unknown as EmodeTag;
                setSelectedEmodeGroup(emodeTag);
                setSelectedBank(groupedEmodeBanks[emodeTag].length > 0 ? groupedEmodeBanks[emodeTag][0] : undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an e-mode group" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.keys(groupedEmodeBanks)
                    .filter((emodeTag) => emodeTag !== "0")
                    .map((emodeTag) => (
                      <SelectItem key={emodeTag} value={emodeTag.toString()}>
                        <div className="flex items-center gap-1.5 lowercase">
                          <IconBolt size={16} className="text-purple-300" />
                          {EmodeTag[emodeTag as keyof typeof EmodeTag]}
                        </div>
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div
            className={cn(
              "space-y-1 w-full",
              (!selectedEmodeGroup || emodeBanks.length === 0) && "pointer-events-none opacity-50"
            )}
          >
            <Label className="text-muted-foreground">Bank</Label>
            <Select
              value={selectedBank?.address.toBase58()}
              onValueChange={(value) => {
                const bank = emodeBanks.find((bank) => bank.address.toBase58() === value);
                setSelectedBank(bank);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an e-mode group" />
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
        </div>

        {selectedBank && (
          <Table className="w-full mt-1">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Group</TableHead>
                <TableHead>Weight Init</TableHead>
                <TableHead>Weight Maint</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emodeEntries.map((entry) => (
                <TableRow
                  key={entry.collateralBankEmodeTag}
                  className="odd:bg-background-gray-light/50 hover:bg-transparent hover:odd:bg-background-gray-light/50"
                >
                  <TableCell className="font-medium">{EmodeTag[entry.collateralBankEmodeTag]}</TableCell>
                  <TableCell>
                    {percentFormatterMod(entry.assetWeightInit.toNumber(), {
                      minFractionDigits: 0,
                      maxFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell>
                    {percentFormatterMod(entry.assetWeightMaint.toNumber(), {
                      minFractionDigits: 0,
                      maxFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { EmodeViewAll };
