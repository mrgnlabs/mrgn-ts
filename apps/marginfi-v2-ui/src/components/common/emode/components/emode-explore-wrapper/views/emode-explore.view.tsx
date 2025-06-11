import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { EmodeTable } from "../../emode-table";

interface ExploreViewProps {
  initialBank?: ExtendedBankInfo;
}

export const ExploreView = ({ initialBank }: ExploreViewProps) => {
  return <EmodeTable initialBank={initialBank} />;
};
