import Link from "next/link";
import { IconInfoCircle } from "@tabler/icons-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

type SVSPMEVProps = {
  bank: ExtendedBankInfo;
  onClaim?: () => Promise<void>;
  className?: string;
};

const SVSPMEV = ({ bank, onClaim, className }: SVSPMEVProps) => {
  if (!bank?.meta.stakePool?.mev) return null;
  const { pool, onramp } = bank.meta.stakePool.mev;

  return (
    <div className={cn("bg-info py-3 px-4 rounded-lg text-foreground/80 text-sm", className)}>
      <p className="mb-4">
        <strong>MEV rewards</strong> earned by the single validator stake pool can be replenished below. Rewards will be
        added to an onramp stake pool, then added to the main pool at the end of the epoch.
        <Link href="" className="inline-flex items-baseline gap-1 ml-1.5 text-foreground">
          <IconInfoCircle size={14} className="translate-y-0.5" /> learn more
        </Link>
      </p>
      <ul className="mb-6">
        <li>Available MEV: {pool > 0 ? dynamicNumeralFormatter(pool / LAMPORTS_PER_SOL) : 0} SOL</li>
        <li>Onramp: {onramp > 0 ? dynamicNumeralFormatter(onramp / LAMPORTS_PER_SOL) : 0} SOL</li>
      </ul>

      <Button className="w-full" onClick={onClaim} disabled={pool <= 0}>
        Replenish MEV
      </Button>
    </div>
  );
};

export { SVSPMEV };
