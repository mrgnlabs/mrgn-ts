import Link from "next/link";
import dynamic from "next/dynamic";

import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { Button } from "~/components/ui/button";
import { IconPlus } from "~/components/ui/icons";
import { Loader } from "~/components/ui/loader";

const AssetsList = dynamic(async () => (await import("~/components/desktop/AssetList")).AssetsList, {
  ssr: false,
});

export default function PoolsPage() {
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);

  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <div className="w-full space-y-8">
          <PageHeading
            heading={<h1>mrgntrade</h1>}
            body={<p>Create permissionless pools, provide liquidity, and trade with mrgntrade.</p>}
            links={[]}
            button={
              <Link href="/trade/pools/create">
                <Button>
                  <IconPlus size={18} /> Create a pool
                </Button>
              </Link>
            }
          />
          <AssetsList />
        </div>
      )}
    </div>
  );
}
