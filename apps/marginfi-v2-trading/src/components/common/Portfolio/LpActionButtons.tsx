import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconMinus, IconPlus } from "@tabler/icons-react";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";
import React from "react";
import { GroupData } from "~/store/tradeStore";

type LpActionButtonsProps = {
  marginfiAccount?: MarginfiAccountWrapper;
  activeGroup: GroupData;
};

export const LpActionButtons = ({ marginfiAccount, activeGroup }: LpActionButtonsProps) => {
  const lendingBank = React.useMemo(() => {
    if (activeGroup?.pool?.token.isActive && activeGroup?.pool?.token.position.isLending)
      return [activeGroup?.pool?.token];
    const lendingBanks = activeGroup?.pool?.quoteTokens.filter((group) => group.isActive && group.position.isLending);
    if (lendingBanks.length > 0) {
      return lendingBanks;
    }

    return null;
  }, [activeGroup?.pool?.quoteTokens, activeGroup?.pool?.token]);

  return (
    <div className="flex gap-3 w-full justify-end">
      <ActionBoxDialog
        requestedBank={activeGroup.pool.quoteTokens[0]}
        requestedAction={ActionType.Deposit}
        requestedAccount={marginfiAccount}
        activeGroupArg={activeGroup}
        isTokenSelectable={true}
      >
        <Button variant="outline" size="sm" className="gap-1 min-w-16">
          <IconPlus size={14} />
          Add
        </Button>
      </ActionBoxDialog>

      <ActionBoxDialog
        activeGroupArg={activeGroup}
        requestedBank={lendingBank ? lendingBank[0] : null}
        requestedAction={ActionType.Withdraw}
        requestedAccount={marginfiAccount}
      >
        <Button variant="outline" size="sm" className="gap-1 min-w-16" disabled={!lendingBank}>
          <IconMinus size={14} />
          Withdraw
        </Button>
      </ActionBoxDialog>
    </div>
  );
};
