import React from "react";
import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";

import { PageHeading } from "~/components/common/PageHeading";
import { EmodeExploreWrapper } from "~/components/common/emode/components";
import { Loader } from "~/components/ui/loader";
import { IconEmodeSimple, IconLooper } from "~/components/ui/icons";
import { useExtendedBanks } from "@mrgnlabs/mrgn-state";

export default function LooperPage() {
  const { connected } = useWallet();

  const { extendedBanks, isSuccess } = useExtendedBanks();

  const extendedBankInfosWithoutStakedAssets = extendedBanks.filter((bank) => bank.info.rawBank.config.assetTag !== 2);

  return (
    <>
      {!isSuccess && <Loader label="Loading looper..." className="mt-16" />}

      {isSuccess && (
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
                  <br />
                  <span className="text-mfi-emode mr-0.5">
                    <IconEmodeSimple size={24} className="inline-block translate-x-0.5" /> e-mode
                  </span>{" "}
                  pairs increase leverage.{" "}
                  <EmodeExploreWrapper
                    trigger={
                      <button className="border-b border-foreground/50 leading-none transition-colors hover:border-transparent">
                        explore e-mode pairs
                      </button>
                    }
                  />
                </p>
              </div>
            }
          />
          <ActionBox.Loop
            useProvider={true}
            loopProps={{
              connected: connected,
              banks: extendedBankInfosWithoutStakedAssets,
              allBanks: extendedBanks,
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
