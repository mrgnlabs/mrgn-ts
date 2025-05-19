import React from "react";
import { ActionBox, useWallet } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";

import { Loader } from "~/components/ui/loader";

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
          <PageHeading heading="Looper ➰" body={<p>Leverage your deposits to maximize yield.</p>} />
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
