import Link from "next/link";
import { IconInfoCircle } from "@tabler/icons-react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { Button } from "~/components/ui/button";

type MEVProps = {
  bank: ExtendedBankInfo;
  className?: string;
};

type MEVClaimProps = MEVProps & {
  onClaim: () => Promise<void>;
};

const SVSPMEVClaim = ({ bank, onClaim }: MEVClaimProps) => {
  if (!bank?.meta.stakePool?.unclaimedLamps?.pool) return null;
  return (
    <div className="space-y-3 bg-info py-3 px-4 rounded-lg text-foreground/80 text-xs">
      <p>
        The {bank.meta.tokenSymbol} stake pool has{" "}
        <strong className="text-foreground">{bank?.meta.stakePool?.unclaimedLamps?.pool / LAMPORTS_PER_SOL} SOL</strong>{" "}
        of unclaimed MEV rewards. MEV rewards can be permissionlessly claimed and will be added to the pool at the end
        of the epoch.
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

const SVSPMEVPending = ({ bank }: MEVProps) => {
  if (!bank?.meta.stakePool?.unclaimedLamps?.onramp) return null;
  return (
    <div className="space-y-3 bg-background py-3 px-4 rounded-lg text-muted-foreground text-xs">
      <p>
        The {bank.meta.tokenSymbol} stake pool has{" "}
        <strong className="text-foreground">
          {bank?.meta.stakePool?.unclaimedLamps?.onramp / LAMPORTS_PER_SOL} SOL
        </strong>{" "}
        of pending MEV rewards. These rewards have been claimed and will be added to the pool at the end of the epoch.
      </p>
    </div>
  );
};

const SVSPMEV = ({ bank, onClaim, className }: MEVClaimProps) => {
  if (!bank?.meta.stakePool?.unclaimedLamps?.pool && !bank?.meta.stakePool?.unclaimedLamps?.onramp) return null;
  return (
    <div className={className}>
      <SVSPMEVClaim bank={bank} onClaim={onClaim} />
      <SVSPMEVPending bank={bank} />
    </div>
  );
};

export { SVSPMEV, SVSPMEVClaim, SVSPMEVPending };
