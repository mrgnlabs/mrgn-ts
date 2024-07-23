import Link from "next/link";
import { useRouter } from "next/router";

import { IconTrendingDown, IconTrendingUp, IconCoins } from "@tabler/icons-react";

import { useTradeStore } from "~/store";

import { Button } from "~/components/ui/button";

export default function FourOhFour() {
  const router = useRouter();
  const [banks] = useTradeStore((state) => [state.banks]);

  const handleFeelingLucky = () => {
    const randomPool = banks[Math.floor(Math.random() * banks.length)];
    if (!randomPool) return;
    router.push(`/trade/${randomPool.address.toBase58()}`);
  };

  return (
    <div className="pt-12 flex flex-col items-center gap-2">
      <IconTrendingDown size={100} className="text-mrgn-error" />
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-medium font-orbitron">404 - Page not found</h1>
        <div className="flex items-center gap-3">
          <Link href="/pools">
            <Button>
              <IconCoins size={16} /> See all pools
            </Button>
          </Link>
          <Button onClick={handleFeelingLucky}>
            <IconTrendingUp size={16} /> Start trading
          </Button>
        </div>
      </div>
    </div>
  );
}
