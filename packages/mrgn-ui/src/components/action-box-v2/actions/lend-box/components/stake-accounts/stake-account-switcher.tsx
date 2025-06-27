import React from "react";

import { IconCheck, IconSwitch, IconChevronDown } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { ExtendedBankInfo, StakePoolMetadata } from "@mrgnlabs/marginfi-v2-ui-state";
import { ValidatorStakeGroup } from "@mrgnlabs/marginfi-client-v2";
import { dynamicNumeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

const StakeAccountSwitcher = ({
  selectedBank,
  selectedStakeAccount,
  stakeAccounts,
  onStakeAccountChange,
  stakePoolMetadataMap,
}: {
  selectedBank: ExtendedBankInfo;
  selectedStakeAccount?: PublicKey;
  stakeAccounts: ValidatorStakeGroup[];
  stakePoolMetadataMap: Map<string, StakePoolMetadata> | null;
  onStakeAccountChange: (stakeAccount: { address: PublicKey; balance: number }) => void;
}) => {
  const [mergeMode, setMergeMode] = React.useState(false);
  const [accountsToMerge, setAccountsToMerge] = React.useState<PublicKey[]>([]);
  const stakePoolMetadata = stakePoolMetadataMap?.get(selectedBank.address.toBase58());

  const currentValidator = stakeAccounts.find((stakeAccount) =>
    stakeAccount.validator.equals(stakePoolMetadata?.validatorVoteAccount || PublicKey.default)
  );

  console.log("HERE IN STAKESWITCHER")
  console.log("stakeAccounts", stakeAccounts);
  console.log("currentValidator", currentValidator);
  console.log("selectedStakeAccount", selectedStakeAccount);

  if (!currentValidator || currentValidator.accounts.length <= 1 || !selectedStakeAccount) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="group h-auto p-0 text-xs font-normal hover:bg-transparent">
          <span className="flex items-center gap-1">
            Stake Account ({shortenAddress(selectedStakeAccount)})
            <IconChevronDown size={14} className="transition-transform rotate-0 group-data-[state=open]:rotate-180" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 bg-muted">
        {/* Header with Merge switch */}
        {/* <div className="flex items-center gap-4 p-3 px-4 border-b">
          <Label htmlFor="merge-mode" className={cn("text-sm text-muted-foreground", mergeMode && "text-foreground")}>
            Merge stake accounts
          </Label>
          <Switch
            id="merge-mode"
            checked={mergeMode}
            onCheckedChange={setMergeMode}
            className="data-[state=unchecked]:bg-accent"
          />
        </div> */}

        {/* Account list */}
        <div className="p-2 space-y-1">
          {currentValidator.accounts.map((account) => {
            const isSelected = account.pubkey.equals(selectedStakeAccount);
            return (
              <Button
                key={account.pubkey.toBase58()}
                variant="ghost"
                className={cn("w-full justify-between items-start h-auto p-2 text-sm font-normal", mergeMode && accountsToMerge.includes(account.pubkey) && "bg-accent", isSelected && "bg-accent")}
                onClick={() => {
                  if (mergeMode) {
                    // check if account is already in accountsToMerge
                    if (accountsToMerge.includes(account.pubkey)) {
                      setAccountsToMerge(accountsToMerge.filter((p) => !p.equals(account.pubkey)));
                    } else {
                      setAccountsToMerge([...accountsToMerge, account.pubkey]);
                    }
                  } else if (!isSelected) {
                    onStakeAccountChange({ address: account.pubkey, balance: account.amount });
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {mergeMode && (
                    <div className="flex items-center justify-center w-4 h-4 rounded-sm bg-accent">
                      {accountsToMerge.includes(account.pubkey) && <IconCheck size={12} />}
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="text-foreground">{shortenAddress(account.pubkey)}</span>
                    <span className="text-muted-foreground text-xs">{shortenAddress(account.pubkey)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-foreground text-xs">{dynamicNumeralFormatter(account.amount)} SOL</span>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Merge button */}
        {mergeMode && accountsToMerge.length > 1 && (
          <div className="p-2 border-t">
            <Button className="w-full" size="sm">
              Merge {accountsToMerge.length} Accounts
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
};

export { StakeAccountSwitcher };
