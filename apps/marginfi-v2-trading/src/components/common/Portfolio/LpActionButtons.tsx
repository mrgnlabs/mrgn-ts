import React from "react";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { cn } from "@mrgnlabs/mrgn-utils";

import { GroupData } from "~/store/tradeStore";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";

type LpActionButtonsProps = {
  marginfiAccount?: MarginfiAccountWrapper;
  activeGroup: GroupData;
  size?: "sm" | "lg";
};

export const LpActionButtons = ({ size = "sm", marginfiAccount, activeGroup }: LpActionButtonsProps) => {
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
    <div className={cn("flex gap-3 w-full", size === "sm" && "justify-end")}>
      <ActionBoxDialog
        requestedBank={activeGroup.pool.quoteTokens[0]}
        requestedAction={ActionType.Deposit}
        requestedAccount={marginfiAccount}
        activeGroupArg={activeGroup}
        isTokenSelectable={true}
      >
        <Button variant="outline" size="sm" className={cn("gap-1 min-w-16", size === "lg" && "w-full")}>
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
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1 min-w-16", size === "lg" && "w-full")}
          disabled={!lendingBank}
        >
          <IconMinus size={14} />
          Withdraw
        </Button>
      </ActionBoxDialog>
    </div>
  );
};
