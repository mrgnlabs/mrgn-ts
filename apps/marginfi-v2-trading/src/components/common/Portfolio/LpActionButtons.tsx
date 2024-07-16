import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconMinus, IconPlus } from "@tabler/icons-react";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import React from "react";
import { useConnection } from "~/hooks/useConnection";
import { useUiStore } from "~/store";
import { ActiveGroup } from "~/store/tradeStore";

type LpActionButtonsProps = {
  marginfiAccount?: MarginfiAccountWrapper;
  activeGroup: ActiveGroup;
};

export const LpActionButtons = ({ marginfiAccount, activeGroup }: LpActionButtonsProps) => {
  const lendingBank = React.useMemo(() => {
    if (activeGroup.token.isActive && activeGroup.token.position.isLending) return activeGroup.token;
    if (activeGroup.usdc.isActive && activeGroup.usdc.position.isLending) return activeGroup.usdc;

    return null;
  }, [activeGroup.token, activeGroup.usdc]);

  return (
    <div className="flex gap-3 w-full">
      <ActionBoxDialog
        requestedBank={activeGroup.usdc}
        requestedAction={ActionType.Deposit}
        requestedAccount={marginfiAccount}
        activeGroupArg={activeGroup}
        isTokenSelectable={true}
      >
        <Button size="sm" className="gap-1 min-w-16">
          <IconPlus size={14} />
          Add
        </Button>
      </ActionBoxDialog>

      <ActionBoxDialog
        activeGroupArg={activeGroup}
        requestedBank={lendingBank}
        requestedAction={ActionType.Withdraw}
        requestedAccount={marginfiAccount}
      >
        <Button size="sm" className="gap-1 min-w-16" disabled={!lendingBank}>
          <IconMinus size={14} />
          Withdraw
        </Button>
      </ActionBoxDialog>
    </div>
  );
};
