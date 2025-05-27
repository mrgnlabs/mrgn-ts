import React from "react";
import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { EmodeExplore } from "~/components/common/emode/components";
import { Loader } from "~/components/ui/loader";
import { IconEmode, IconLooper } from "~/components/ui/icons";

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
        <div className="w-full max-w-7xl mx-auto mb-20 px-2 md:px-5">
          <PageHeading
            heading={
              <div className="flex items-center justify-center gap-2.5">
                Looper
                <IconLooper size={52} />
              </div>
            }
            body={
              <div className="flex flex-col items-center -translate-y-1">
                <p>
                  Leverage your deposits to maximize yield.
                  {/* <br />
                  <IconEmode size={24} className="inline-block" /> e-mode pairs increase leverage.{" "}
                  <EmodeExplore
                    trigger={
                      <button className="border-b border-foreground/50 leading-none transition-colors hover:border-transparent">
                        explore e-mode pairs
                      </button>
                    }
                  /> */}
                </p>
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
