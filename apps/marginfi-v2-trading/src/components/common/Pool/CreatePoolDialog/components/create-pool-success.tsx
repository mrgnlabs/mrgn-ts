import { IconConfetti, IconExternalLink } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";

import type { PoolData } from "../types";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import Link from "next/link";

type CreatePoolSuccessProps = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  poolData: PoolData | null;
};

export const CreatePoolSuccess = ({ poolData, setIsOpen }: CreatePoolSuccessProps) => {
  return (
    <div className="flex flex-col justify-center items-center gap-12">
      <div className="text-center space-y-12">
        <div className="flex flex-col items-center gap-3">
          <IconConfetti size={48} />
          <h2 className="text-3xl font-medium">Pool created!</h2>
          <p className="text-muted-foreground">
            Your pool has been created. It will be verified before it shows on mrgntrade.
          </p>
        </div>
        {poolData && (
          <div className="flex flex-col items-center justify-center gap-3 mt-8">
            <img
              src={poolData.token.icon}
              alt={`${poolData.token.symbol} icon`}
              width={64}
              height={64}
              className="rounded-full"
            />
            <h1 className="font-medium text-xl">
              {poolData.token.name} <span className="font-normal">({poolData.token.symbol})</span>
            </h1>
            <Link
              href={`https://solscan.io/account/${poolData.token.mint}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground group flex items-center gap-1"
            >
              <span className="border-b border-border transition-colors group-hover:border-transparent">
                {shortenAddress(poolData.group || poolData.token.mint)}
              </span>
              <IconExternalLink size={16} />
            </Link>
          </div>
        )}
      </div>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </div>
  );
};
