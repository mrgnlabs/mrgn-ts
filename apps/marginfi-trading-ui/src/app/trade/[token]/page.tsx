import Link from "next/link";

import { IconChevronsLeft } from "@tabler/icons-react";

import TradingViewWidget from "~/components/tv-widget";
import { Trade } from "~/components/trade";
import { Positions } from "~/components/positions";
import { Button } from "~/components/ui/button";

type TradePageProps = {
  params: {
    token: string;
  };
};

export default function TradeTokenPage({ params }: TradePageProps) {
  return (
    <div className="flex flex-col items-start gap-8 pb-16 px-4 lg:px-8">
      <Link href="/pools">
        {" "}
        <Button variant="outline">
          <IconChevronsLeft size={20} /> Back to pools
        </Button>
      </Link>
      <div className="grid grid-cols-10 gap-4 w-full h-full lg:gap-8">
        <div className="col-span-8 space-y-8 h-[60vh]">
          <TradingViewWidget />
        </div>
        <aside className="col-span-2 row-span-2">
          <Trade />
        </aside>
        <div className="col-span-8 space-y-8">
          <Positions />
        </div>
      </div>
    </div>
  );
}
