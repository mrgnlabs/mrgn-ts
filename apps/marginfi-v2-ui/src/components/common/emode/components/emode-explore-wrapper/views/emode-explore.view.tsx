import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";

import { EmodeTable } from "../../emode-table";

interface ExploreViewProps {
  initialBank?: ExtendedBankInfo;
}

export const ExploreView = ({ initialBank }: ExploreViewProps) => {
  return <EmodeTable initialBank={initialBank} />;
};
