import Link from "next/link";

import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { IconPlus } from "~/components/ui/icons";
import { Loader } from "~/components/ui/loader";
import { Button } from "~/components/ui/button";

export default function PortfolioPage() {
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);
  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <>
          <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
            <PageHeading
              heading={<h1>Portfolio</h1>}
              body={<p>Manage your mrgntrade positions.</p>}
              links={[]}
              button={
                <Link href="/trade/pools/create">
                  <Button>
                    <IconPlus size={18} /> Create a pool
                  </Button>
                </Link>
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
