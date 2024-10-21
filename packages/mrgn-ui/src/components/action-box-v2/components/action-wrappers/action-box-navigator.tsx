import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconSparkles } from "@tabler/icons-react";

interface ActionBoxNavigatorProps {
  selectedAction: ActionType;
  actionTypes?: ActionType[];
  onSelectAction?: (action: ActionType) => void;
  children: React.ReactNode;
}

const actionTitles: { [key in ActionType]?: string } = {
  [ActionType.Borrow]: "You borrow",
  [ActionType.Deposit]: "You supply",
  [ActionType.Withdraw]: "You withdraw",
  [ActionType.Repay]: "You repay",
  [ActionType.RepayCollat]: "You repay with collateral",
  [ActionType.MintLST]: "You stake",
  [ActionType.UnstakeLST]: "You unstake",
  [ActionType.Loop]: "You deposit",
};

const toggleTitles: { [key in ActionType]?: string } = {
  [ActionType.Borrow]: "Borrow",
  [ActionType.Deposit]: "Lend",
  [ActionType.Withdraw]: "Withdraw",
  [ActionType.Repay]: "Repay",
  [ActionType.RepayCollat]: "Collateral Repay",
  [ActionType.MintLST]: "You stake",
  [ActionType.UnstakeLST]: "You unstake",
  [ActionType.Loop]: "You deposit",
};

const newFeatures = [ActionType.RepayCollat];

export const ActionBoxNavigator = ({
  actionTypes,
  selectedAction,
  onSelectAction,
  children,
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
      <div className="flex flex-row items-center justify-between mb-2">
        {/* Title text */}

        <div className="text-lg font-normal flex items-center">
          {isNavigator ? (
            <div>
              <ToggleGroup
                variant="actionBox"
                type="single"
                className="bg-mfi-action-box-background-dark"
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
                    className="data-[state=on]:bg-mfi-action-box-accent data-[state=on]:text-mfi-action-box-accent-foreground hover:bg-mfi-action-box-accent/50 capitalize h-[1.65rem]"
                  >
                    {newFeatures.includes(toggle.value) ? (
                      <div className="flex items-center gap-2">
                        <IconSparkles size={16} /> {toggle.text}
                      </div>
                    ) : (
                      toggle.text
                    )}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ) : (
            <span className="text-sm font-normal text-muted-foreground">{actionTitles[selectedAction]}</span>
          )}
        </div>
      </div>
      {childrenArray[currentIndex]}
    </>
  );
};
