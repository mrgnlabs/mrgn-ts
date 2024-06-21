import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { useMrgnlendStore, useUiStore } from "~/store";

import { ActionBox } from "~/components/common/ActionBox";
import { ActionComplete } from "~/components/common/ActionComplete";
import { PageHeading } from "~/components/common/PageHeading";

import { Loader } from "~/components/ui/loader";

export default function LooperPage() {
  const [initialized] = useMrgnlendStore((state) => [state.initialized, state.extendedBankInfos]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  return (
    <>
      {!initialized && <Loader label="Loading mrgnloop..." className="mt-16" />}

      {initialized && (
        <div className="w-full max-w-7xl mx-auto mb-20 px-5">
          <PageHeading
            heading={<h1>mrgnloop ➰</h1>}
            body={<p>Loop your deposits &amp; borrows with flashloans to maximize yield.</p>}
            links={[]}
          />
          <ActionBox requestedAction={ActionType.Loop} />
        </div>
      )}

      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
