import Link from "next/link";
import { useRouter } from "next/router";

import { useMrgnlendStore } from "~/store";

import { TVWidget } from "~/components/common/Trade/TVWidget";
import { TradingBox } from "~/components/common/Trade/TradingBox";
import { Positions } from "~/components/common/Trade/Positions";
import { PageHeading } from "~/components/common/PageHeading";
import { IconChevronsLeft } from "~/components/ui/icons";
import { Loader } from "~/components/ui/loader";
import { Button } from "~/components/ui/button";

export default function TradeSymbolPage() {
  const router = useRouter();
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);
  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 z-10">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <div className="flex flex-col items-start gap-8 pb-16 w-full">
          <Link href="/trade">
            {" "}
            <Button variant="outline">
              <IconChevronsLeft size={20} /> Back to pools
            </Button>
          </Link>
          <div className="grid grid-cols-12 gap-4 w-full h-full lg:gap-8">
            <div className="col-span-9 space-y-8 h-[60vh]">
              <TVWidget />
            </div>
            <aside className="col-span-3">
              <TradingBox />
            </aside>
            <div className="col-span-12 space-y-8">
              <Positions />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
