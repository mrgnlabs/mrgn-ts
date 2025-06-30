import React from "react";

import { IconCheck, IconSwitch, IconChevronDown } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { ExtendedBankInfo, StakePoolMetadata } from "@mrgnlabs/mrgn-state";
import { ValidatorStakeGroup, MarginfiClient, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import {
  dynamicNumeralFormatter,
  shortenAddress,
  TransactionType,
  addTransactionMetadata,
} from "@mrgnlabs/mrgn-common";
import { cn, executeActionWrapper, composeExplorerUrl } from "@mrgnlabs/mrgn-utils";

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
  marginfiClient,
  selectedAccount,
  onRefresh,
}: {
  selectedBank: ExtendedBankInfo;
  selectedStakeAccount?: PublicKey;
  stakeAccounts: ValidatorStakeGroup[];
  stakePoolMetadataMap: Map<string, StakePoolMetadata> | null;
  onStakeAccountChange: (stakeAccount: { address: PublicKey; balance: number }) => void;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  onRefresh?: () => void;
}) => {
  const [mergeMode, setMergeMode] = React.useState(false);
  const [accountsToMerge, setAccountsToMerge] = React.useState<PublicKey[]>([]);
  const stakePoolMetadata = stakePoolMetadataMap?.get(selectedBank.address.toBase58());

  const currentValidator = stakeAccounts.find((stakeAccount) =>
    stakeAccount.validator.equals(stakePoolMetadata?.validatorVoteAccount || PublicKey.default)
  );

  // Auto-select current account when merge mode is enabled
  React.useEffect(() => {
    if (mergeMode && selectedStakeAccount) {
      setAccountsToMerge([selectedStakeAccount]);
    } else if (!mergeMode) {
      setAccountsToMerge([]);
    }
  }, [mergeMode, selectedStakeAccount]);

  const mergeStakeAccounts = async () => {
    if (!marginfiClient || !selectedAccount || accountsToMerge.length !== 2) {
      return;
    }

    // The first account (currently selected) is the destination
    // The second account (additional selected) is the source
    const [destinationAccount, sourceAccount] = accountsToMerge;

    await executeActionWrapper({
      actionName: "Merge stake accounts",
      steps: [{ label: "Signing transaction" }, { label: "Merging stake accounts" }],
      action: async (txns, onSuccessAndNext) => {
        const mergeTx = await selectedAccount.makeMergeStakeAccountsTx(sourceAccount, destinationAccount);
        const sigs = await marginfiClient.processTransactions([mergeTx], {
          broadcastType: "RPC",
          callback(index, success, sig, stepsToAdvance) {
            success && onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig);
          },
        });
        return sigs[0];
      },
      onComplete: () => {
        // Reset merge mode and refresh
        setMergeMode(false);
        setAccountsToMerge([]);
        onRefresh?.();
      },
      txns: {
        transactions: [],
      },
    });
  };

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
      {/* mfi-action-box-action class to prevent AssetRow link */}
      <PopoverContent className="mfi-action-box-action w-64 p-0 bg-muted">
        {/* Header with Merge switch */}
        <div className="flex items-center gap-4 p-3 px-4 border-b">
          <Label htmlFor="merge-mode" className={cn("text-sm text-muted-foreground", mergeMode && "text-foreground")}>
            Merge stake accounts
          </Label>
          <Switch
            id="merge-mode"
            checked={mergeMode}
            onCheckedChange={setMergeMode}
            className="data-[state=unchecked]:bg-accent"
          />
        </div>

        {/* Account list */}
        <div className="p-2 space-y-1">
          {currentValidator.accounts.map((account) => {
            const isSelected = account.pubkey.equals(selectedStakeAccount);
            const isInMergeList = accountsToMerge.includes(account.pubkey);
            const isCurrentAccount = isSelected;

            return (
              <Button
                key={account.pubkey.toBase58()}
                variant="ghost"
                disabled={mergeMode && isCurrentAccount} // Disable current account in merge mode
                className={cn(
                  "w-full justify-between items-start h-auto p-2 text-sm font-normal",
                  mergeMode && isInMergeList && "bg-accent",
                  isSelected && !mergeMode && "bg-accent"
                )}
                onClick={() => {
                  if (mergeMode) {
                    if (isCurrentAccount) {
                      // Current account is always selected in merge mode
                      return;
                    }

                    // Toggle additional account selection
                    if (isInMergeList) {
                      setAccountsToMerge(accountsToMerge.filter((p) => !p.equals(account.pubkey)));
                    } else {
                      // Only allow one additional account
                      const currentAccount = accountsToMerge[0]; // The currently selected account
                      setAccountsToMerge([currentAccount, account.pubkey]);
                    }
                  } else if (!isSelected) {
                    onStakeAccountChange({ address: account.pubkey, balance: account.amount });
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {mergeMode && (
                    <div className="flex items-center justify-center w-4 h-4 rounded-sm bg-accent">
                      {isInMergeList && <IconCheck size={12} />}
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="text-foreground">{shortenAddress(account.pubkey)}</span>
                    <span className="text-muted-foreground text-xs">
                      {isCurrentAccount ? "Current" : `${dynamicNumeralFormatter(account.amount)} SOL`}
                    </span>
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
        {mergeMode && accountsToMerge.length === 2 && (
          <div className="p-2 border-t">
            <Button
              className="w-full"
              size="sm"
              onClick={() => {
                mergeStakeAccounts();
              }}
            >
              Merge into {shortenAddress(accountsToMerge[0])}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export { StakeAccountSwitcher };
