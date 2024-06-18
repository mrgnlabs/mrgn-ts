import React from "react";

import Link from "next/link";

import { useTradeStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";

import { PageHeading } from "~/components/common/PageHeading";
import { PoolCard } from "~/components/common/Pool/PoolCard";
import { CreatePoolDialog } from "~/components/common/Pool/CreatePoolDialog";
import { IconSearch, IconSortDescending, IconFilter, IconPlus } from "~/components/ui/icons";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { Loader } from "~/components/ui/loader";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export default function HomePage() {
  const { wallet } = useWalletContext();
  const { connection } = useConnection();
  const [initialized, fetchTradeState, banks] = useTradeStore((state) => [
    state.initialized,
    state.fetchTradeState,
    state.banks,
  ]);

  React.useEffect(() => {
    fetchTradeState({
      wallet,
      connection,
    });
  }, []);

  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <>
          <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
            <PageHeading
              heading={<h1>mrgntrade</h1>}
              body={<p>Create permissionless pools, provide liquidity, and trade with mrgntrade.</p>}
              links={[]}
              button={<CreatePoolDialog />}
            />
          </div>

          <div className="w-full space-y-8 px-4 lg:px-8 pt-8 pb-16">
            <div className="flex items-center gap-4">
              <div className="relative w-full">
                <IconSearch size={18} className="absolute inset-y-0 left-4 h-full" />
                <Input placeholder="Search token names / symbols" className="py-2 pr-3 pl-12 h-10 rounded-lg" />
              </div>
              <div className="flex items-center gap-4 ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="lg" className="py-2 h-10">
                      <IconSortDescending size={20} /> Sort
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80"></PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="lg" className="py-2 h-10">
                      <IconFilter size={20} /> Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80"></PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {banks.length > 0 && banks.map((bank, i) => <PoolCard key={i} bank={bank} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
