import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconMinus, IconX, IconPlus } from "@tabler/icons-react";

import { cn } from "~/utils";

import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";

type PositionActionButtonsProps = {
  marginfiAccount?: MarginfiAccountWrapper;
  isBorrowing: boolean;
  bank: ActiveBankInfo;
  collateralBank?: ExtendedBankInfo | null;
  rightAlignFinalButton?: boolean;
};

export const PositionActionButtons = ({
  marginfiAccount,
  isBorrowing,
  bank,
  collateralBank = null,
  rightAlignFinalButton = false,
}: PositionActionButtonsProps) => {
  return (
    <div className="flex gap-3 w-full">
      <ActionBoxDialog
        requestedBank={bank.position.isLending ? bank : collateralBank}
        requestedAction={ActionType.Deposit}
        requestedAccount={marginfiAccount}
      >
        <Button variant="secondary" size="sm" className="gap-1 min-w-16">
          <IconPlus size={14} />
          Add
        </Button>
      </ActionBoxDialog>
      {collateralBank && isBorrowing && (
        <ActionBoxDialog
          requestedBank={bank.position.isLending ? collateralBank : bank}
          requestedAction={ActionType.Repay}
          requestedAccount={marginfiAccount}
        >
          <Button variant="secondary" size="sm" className="gap-1 min-w-16">
            <IconMinus size={14} />
            Reduce
          </Button>
        </ActionBoxDialog>
      )}
      {!isBorrowing && (
        <ActionBoxDialog
          requestedBank={
            bank.position.isLending ? (collateralBank && collateralBank.isActive ? collateralBank : bank) : bank
          }
          requestedAction={ActionType.Withdraw}
          requestedAccount={marginfiAccount}
          requestedCollateralBank={
            bank.position.isLending
              ? collateralBank && collateralBank.isActive
                ? bank
                : collateralBank || undefined
              : collateralBank || undefined
          }
        >
          <Button variant="secondary" size="sm" className="gap-1 min-w-16">
            <IconMinus size={14} />
            Withdraw
          </Button>
        </ActionBoxDialog>
      )}
      <Button variant="destructive" size="sm" className={cn("gap-1 min-w-16", rightAlignFinalButton && "ml-auto")}>
        <IconX size={14} />
        Close
      </Button>
    </div>
  );
};
