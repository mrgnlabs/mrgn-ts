import Link from "next/link";

import { PublicKey } from "@solana/web3.js";
import { IconExternalLink, IconInfoCircle } from "@tabler/icons-react";

import { ExtendedBankInfo, ValidatorStakeGroup } from "@mrgnlabs/marginfi-v2-ui-state";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { StakeAccountSwitcher } from "./stake-account-switcher";
import { Tooltip, TooltipContent, TooltipPortal, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

type StakeAccountsProps = {
  selectedBank: ExtendedBankInfo;
  selectedStakeAccount?: PublicKey;
  stakeAccounts: ValidatorStakeGroup[];
  onStakeAccountChange: (stakeAccount: { address: PublicKey; balance: number }) => void;
};

const StakeAccounts = ({
  selectedBank,
  selectedStakeAccount,
  stakeAccounts,
  onStakeAccountChange,
}: StakeAccountsProps) => {
  return (
    <div className="flex gap-2 items-start justify-between -translate-y-1 mb-3">
      <ul className="text-xs text-muted-foreground font-light">
        <li className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <IconInfoCircle size={13} /> Staked asset bank
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>
                  <div className="flex flex-col gap-2 text-xs">
                    <p className="text-muted-foreground">
                      To deposit into a staked asset bank you will first deposit native stake into a stake pool for this
                      validator. You will mint {selectedBank.meta.tokenSymbol} LST which will then be deposited into the
                      bank.
                    </p>
                    <Link href="#" className="border-b border-foreground/50 max-w-fit flex items-center gap-1">
                      <IconExternalLink size={13} />
                      Learn more about staked collateral.
                    </Link>
                  </div>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </TooltipProvider>
        </li>
        {selectedBank.meta.stakePool && (
          <li>
            Validator:{" "}
            <span className="text-foreground">
              {shortenAddress(selectedBank.meta.stakePool.validatorVoteAccount.toBase58())}
            </span>
          </li>
        )}
      </ul>
      <StakeAccountSwitcher
        selectedBank={selectedBank}
        selectedStakeAccount={selectedStakeAccount}
        stakeAccounts={stakeAccounts}
        onStakeAccountChange={onStakeAccountChange}
      />
    </div>
  );
};

export { StakeAccounts };
