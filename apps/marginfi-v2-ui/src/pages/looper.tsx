import React from "react";
import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { EmodeExplore } from "~/components/common/emode/components";
import { Loader } from "~/components/ui/loader";
import { IconBolt } from "@tabler/icons-react";

export default function LooperPage() {
  const [initialized, extendedBankInfosWithoutStakedAssets, extendedBankInfos] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfosWithoutStakedAssets,
    state.extendedBankInfos,
  ]);
  const { connected } = useWallet();

  return (
    <>
      {!initialized && <Loader label="Loading looper..." className="mt-16" />}

      {initialized && (
        <div className="w-full max-w-7xl mx-auto mb-20 px-5">
          <PageHeading
            heading="Looper ➰"
            body={
              <div className="flex flex-col items-center">
                <p>Leverage your deposits to maximize yield.</p>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 text-purple-300">
                    <IconBolt size={16} className="translate-y-px" /> e-mode
                  </div>
                  <p>
                    pairs enable increased leverage,{" "}
                    <EmodeExplore
                      trigger={<button className="border-b border-foreground/50">explore e-mode pairings</button>}
                    />
                  </p>
                </div>
              </div>
            }
          />
          <ActionBox.Loop
            useProvider={true}
            loopProps={{
              connected: connected,
              banks: extendedBankInfosWithoutStakedAssets,
              allBanks: extendedBankInfos,
              captureEvent: (event, properties) => {
                capture(event, properties);
              },
            }}
          />
        </div>
      )}
    </>
  );
}
