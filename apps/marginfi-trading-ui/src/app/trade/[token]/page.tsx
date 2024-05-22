import TradingViewWidget from "~/components/tv-widget";
import { Trade } from "~/components/trade";

type TradePageProps = {
  params: {
    token: string;
  };
};

export default function TradeTokenPage({ params }: TradePageProps) {
  return (
    <div className="flex flex-col px-4 lg:px-8">
      <div className="grid grid-cols-10 gap-4 w-full h-full lg:gap-8">
        <div className="col-span-8">
          <TradingViewWidget />
        </div>
        <aside className="col-span-2">
          <Trade />
        </aside>
      </div>
      <div className="py-16">Hello positions</div>
    </div>
  );
}
