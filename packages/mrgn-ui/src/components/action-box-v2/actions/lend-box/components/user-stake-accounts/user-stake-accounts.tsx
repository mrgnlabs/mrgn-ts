import { IconCheck, IconSwitch } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { ExtendedBankInfo, ValidatorStakeGroup } from "@mrgnlabs/marginfi-v2-ui-state";
import { dynamicNumeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const UserStakeAccounts = ({
  selectedBank,
  userStakeAccounts,
}: {
  selectedBank: ExtendedBankInfo;
  userStakeAccounts: ValidatorStakeGroup[];
}) => {
  const stakeAccounts = userStakeAccounts.find((stakeAccount) =>
    stakeAccount.validator.equals(selectedBank.meta.stakePool?.validatorVoteAccount || PublicKey.default)
  );
  return (
    <div className="-translate-y-1 mb-3 flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-xs text-muted-foreground flex items-center gap-1 max-w-fit">
            <IconSwitch size={14} />
            Switch stake account
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            {stakeAccounts?.accounts.map((account) => (
              <DropdownMenuItem
                key={account.pubkey.toBase58()}
                className={cn(
                  "flex justify-between gap-12 text-xs text-muted-foreground focus:text-foreground focus:bg-transparent",
                  account.pubkey.equals(stakeAccounts.selectedAccount?.pubkey) && "text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5",
                    !account.pubkey.equals(stakeAccounts.selectedAccount?.pubkey) && "pl-5"
                  )}
                >
                  {account.pubkey.equals(stakeAccounts.selectedAccount?.pubkey) && <IconCheck size={15} />}
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

export { UserStakeAccounts };
