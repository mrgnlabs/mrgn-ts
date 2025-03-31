import Link from "next/link";
import { IconInfoCircle } from "@tabler/icons-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";

type MEVProps = {
  bank: ExtendedBankInfo;
  onClaim?: () => Promise<void>;
  className?: string;
  pendingClassName?: string;
  claimClassName?: string;
};

const SVSPMEVClaim = ({ bank, onClaim, claimClassName }: MEVProps) => {
  if (!bank?.meta.stakePool?.unclaimedLamps?.pool) return null;
  return (
    <div className={cn("space-y-3 bg-info py-3 px-4 rounded-lg text-foreground/80 text-sm", claimClassName)}>
      <p>
        The {bank.meta.tokenSymbol} stake pool has{" "}
        <strong className="text-foreground">{bank?.meta.stakePool?.unclaimedLamps?.pool / LAMPORTS_PER_SOL} SOL</strong>{" "}
        of unclaimed MEV rewards. MEV rewards can be claimed and will be added to the pool at end of epoch.
      </p>
      <Link href="" className="inline-flex items-center gap-1">
        <IconInfoCircle size={14} /> learn more
      </Link>

      <Button className="w-full" onClick={onClaim}>
        Claim MEV rewards
      </Button>
    </div>
  );
};

const SVSPMEVPending = ({ bank, pendingClassName }: MEVProps) => {
  if (!bank?.meta.stakePool?.unclaimedLamps?.onramp) return null;
  return (
    <div className={cn("space-y-3 bg-background py-3 px-4 rounded-lg text-foreground/80 text-sm", pendingClassName)}>
      <p>
        The {bank.meta.tokenSymbol} stake pool has{" "}
        <strong className="text-foreground text-opacity-100">
          {bank?.meta.stakePool?.unclaimedLamps?.onramp / LAMPORTS_PER_SOL} SOL
        </strong>{" "}
        of pending MEV rewards. Rewards have been claimed and will be added to the pool at end of epoch.
      </p>
    </div>
  );
};

const SVSPMEV = ({ bank, onClaim, className, pendingClassName, claimClassName }: MEVProps) => {
  if (!bank?.meta.stakePool?.unclaimedLamps?.pool && !bank?.meta.stakePool?.unclaimedLamps?.onramp) return null;
  return (
    <div className={className}>
      <SVSPMEVClaim bank={bank} onClaim={onClaim} claimClassName={claimClassName} />
      <SVSPMEVPending bank={bank} pendingClassName={pendingClassName} />
    </div>
  );
};

export { SVSPMEV, SVSPMEVClaim, SVSPMEVPending };
