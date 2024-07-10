import React from "react";

import { useTradeStore, useUiStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { ActionComplete } from "~/components/common/ActionComplete";
import { Loader } from "~/components/ui/loader";

export default function PortfolioPage() {
  const [initialized] = useTradeStore((state) => [state.initialized, state.banks]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
        {initialized && (
          <div className="space-y-4">
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading heading="create pool" links={[]} />
            </div>
          </div>
        )}
      </div>
      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
