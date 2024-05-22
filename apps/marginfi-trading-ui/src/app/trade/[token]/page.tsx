import TradingViewWidget from "~/components/tv-widget";
import { Trade } from "~/components/trade";
import { Positions } from "~/components/positions";

type TradePageProps = {
  params: {
    token: string;
  };
};

export default function TradeTokenPage({ params }: TradePageProps) {
  return (
    <div className="flex flex-col gap-8 px-4 lg:px-8">
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
