import React from "react";

import Link from "next/link";

import { IconConfetti, IconExternalLink, IconSettings } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";

import type { PoolData } from "../types";

type CreatePoolSuccessProps = {
  poolData: PoolData | null;
};

export const CreatePoolSuccess = ({ poolData }: CreatePoolSuccessProps) => {
  if (!poolData || !poolData.token || !poolData.quoteToken || !poolData.group) return null;

  return (
    <div className="flex flex-col justify-center items-center gap-12">
      <div className="text-center space-y-12">
        <div className="flex flex-col items-center gap-3">
          <IconConfetti size={48} />
          <h2 className="text-3xl font-medium">Pool created!</h2>
          <p className="text-muted-foreground max-w-xl mx-auto w-full">
            It may take a few minutes for your pool to show up in The Arena. In the meantime you can supply initial
            liquidity to both sides of the pool from the pool admin page. It&apos;s important to attract liquidity
            providers, who earn yield on their deposits, to your pool in order to support trading.{" "}
            <Link
              href="https://docs.marginfi.com/the-arena#supply-liquidity-and-earn-yield"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Learn more
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 mt-8">
          <div className="flex items-center translate-x-2.5">
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src={poolData.token.icon}
              alt={`${poolData.token.symbol} icon`}
              width={48}
              height={48}
              className="rounded-full w-[48px] h-[48px] object-cover"
            />
            <img
              src={poolData.quoteToken.icon}
              alt={`${poolData.quoteToken.symbol} icon`}
              width={48}
              height={48}
              className="rounded-full w-[48px] h-[48px] object-cover -translate-x-5"
            />
            {/* eslint-enable @next/next/no-img-element */}
          </div>
          <h2 className="text-2xl font-medium">
            {poolData.token.symbol} / {poolData.quoteToken.symbol}
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <Link href="/admin">
              <Button variant="outline">
                <IconSettings size={18} /> Manage Pool
              </Button>
            </Link>
            <Link href={`/trade/${poolData.group}`}>
              <Button variant="outline">
                <IconExternalLink size={18} /> View Pool
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
