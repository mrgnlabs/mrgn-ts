import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconInfoCircle, IconRefresh, IconRocket, IconSparkles } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { TooltipProvider } from "~/components/ui/tooltip";
import Link from "next/link";

interface ActionBoxNavigatorProps {
  selectedAction: ActionType;
  actionTypes?: ActionType[];
  onSelectAction?: (action: ActionType) => void;
  children: React.ReactNode;
  onClose?: () => void;
}

// const actionTitles: { [key in ActionType]?: string } = {
//   [ActionType.Borrow]: "You borrow",
//   [ActionType.Deposit]: "You supply",
//   [ActionType.Withdraw]: "You withdraw",
//   [ActionType.Repay]: "You repay",
//   [ActionType.RepayCollat]: "You repay with collateral",
//   [ActionType.MintLST]: "You stake",
//   [ActionType.UnstakeLST]: "You unstake",
//   [ActionType.Loop]: "You deposit",
// };

const toggleTitles: { [key in ActionType]?: string | React.ReactNode } = {
  [ActionType.Borrow]: "Borrow",
  [ActionType.Deposit]: "Lend",
  [ActionType.Withdraw]: "Withdraw",
  [ActionType.Repay]: "Repay",
  [ActionType.RepayCollat]: "Collateral Repay",
  [ActionType.MintLST]: "Stake",
  [ActionType.UnstakeLST]: "Instant Unstake",
  [ActionType.UnstakeFull]: (
    <span>
      Unstake <span className="text-[11px] text-muted-foreground">(1-2 days)</span>
    </span>
  ),
  [ActionType.Loop]: "You deposit",
};

const toggleIcons: { [key in ActionType]?: React.ReactNode } = {
  [ActionType.UnstakeLST]: <IconRocket size={16} />,
};

export const ActionBoxNavigator = ({
  actionTypes,
  selectedAction,
  onSelectAction,
  children,
  onClose,
}: ActionBoxNavigatorProps) => {
  const childrenArray = React.Children.toArray(children);
  const isNavigator = React.useMemo(() => actionTypes && actionTypes.length > 1, [actionTypes]);
  const currentIndex = React.useMemo(() => {
    if (!isNavigator || !actionTypes) return 0;

    return actionTypes.findIndex((actionType) => actionType === selectedAction);
  }, [isNavigator, actionTypes, selectedAction]);

  const navigatorToggles = React.useMemo(() => {
    if (!isNavigator || !actionTypes) return [];

    return actionTypes.map((actionType) => ({
      value: actionType,
      text: toggleTitles[actionType] || "",
    }));
  }, [actionTypes, isNavigator]);

  return (
    <>
      <div className="flex flex-row items-center justify-between">
        {/* Title text */}

        {isNavigator && (
          <div className="text-lg font-normal flex items-center justify-between w-full mb-2.5">
            <>
              <div>
                <ToggleGroup
                  variant="actionBox"
                  type="single"
                  className="bg-mfi-action-box-background-dark p-1.5 rounded-md"
                  value={selectedAction}
                  onValueChange={(value) => {
                    if (value !== "") {
                      onSelectAction && onSelectAction(value as ActionType);
                    }
                  }}
                >
                  {navigatorToggles.map((toggle, idx) => (
                    <ToggleGroupItem
                      key={idx}
                      value={toggle.value}
                      aria-label={toggle.value}
                      className="gap-1.5 data-[state=on]:bg-mfi-action-box-accent data-[state=on]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent/50 capitalize h-[1.65rem]"
                    >
                      {toggleIcons[toggle.value]}
                      {toggle.text}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {selectedAction === ActionType.Deposit && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/deposit-swap">
                        <Button
                          className="ml-auto font-light text-muted-foreground text-left h-7 gap-1.5"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onClose?.();
                          }}
                        >
                          <IconRefresh size={14} />
                          Deposit Swap
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Swap any token and deposit in your chosen collateral.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          </div>
        )}
      </div>
      {childrenArray[currentIndex]}
    </>
  );
};
