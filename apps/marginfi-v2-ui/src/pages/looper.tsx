import React from "react";
import { ActionBox as ActionBoxV2 } from "@mrgnlabs/mrgn-ui";
import { capture } from "@mrgnlabs/mrgn-utils";
import { useMrgnlendStore, useUiStore } from "~/store";

import { ActionComplete } from "~/components/common/ActionComplete";
import { PageHeading } from "~/components/common/PageHeading";

import { Loader } from "~/components/ui/loader";
import { useWallet } from "~/components/wallet-v2";

export default function LooperPage() {
  const [initialized] = useMrgnlendStore((state) => [state.initialized, state.extendedBankInfos]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const { connected, walletContextState } = useWallet();

  return (
    <>
      {!initialized && <Loader label="Loading mrgnloop..." className="mt-16" />}

      {initialized && (
        <div className="w-full max-w-7xl mx-auto mb-20 px-5">
          <PageHeading heading="mrgnloop ➰" body={<p>Leverage your deposits to maximize yield.</p>} />
          <ActionBoxV2.Loop
            useProvider={true}
            loopProps={{
              connected: connected,
              walletContextState: walletContextState,
              captureEvent: (event, properties) => {
                capture(event, properties);
              },
            }}
          />
        </div>
      )}

      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
