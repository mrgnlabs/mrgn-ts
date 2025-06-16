import { IconCheck, IconSwitch } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
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

const StakeAccountSwitcher = ({
  selectedBank,
  selectedStakeAccount,
  stakeAccounts,
  onStakeAccountChange,
}: {
  selectedBank: ExtendedBankInfo;
  selectedStakeAccount?: PublicKey;
  stakeAccounts: ValidatorStakeGroup[];
  onStakeAccountChange: (stakeAccount: { address: PublicKey; balance: number }) => void;
}) => {
  const currentValidator = stakeAccounts.find((stakeAccount) =>
    stakeAccount.validator.equals(selectedBank.meta.stakePool?.validatorVoteAccount || PublicKey.default)
  );

  const selectedStakeAccountFallback = selectedStakeAccount || PublicKey.default;

  if (!currentValidator || currentValidator.accounts.length <= 1) return null;

  return (
    <div className="flex justify-end -translate-y-1 mb-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-xs text-muted-foreground flex items-center gap-1 max-w-fit">
            <IconSwitch size={14} />
            Switch stake account
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            {currentValidator.accounts.map((account) => (
              <DropdownMenuItem
                key={account.pubkey.toBase58()}
                className={cn(
                  "flex justify-between gap-12 text-xs text-muted-foreground focus:text-foreground focus:bg-transparent",
                  account.pubkey.equals(selectedStakeAccountFallback) && "text-foreground"
                )}
                onClick={() => {
                  onStakeAccountChange({ address: account.pubkey, balance: account.amount });
                }}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5",
                    !account.pubkey.equals(selectedStakeAccountFallback) && "pl-5"
                  )}
                >
                  {account.pubkey.equals(selectedStakeAccountFallback) && <IconCheck size={15} />}
                  {shortenAddress(account.pubkey)}
                </div>
                <span>{dynamicNumeralFormatter(account.amount)} SOL</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export { StakeAccountSwitcher };
