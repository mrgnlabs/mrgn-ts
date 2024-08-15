import React, { useEffect } from "react";

import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import { WSOL_MINT, nativeToUi } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useLstStore, useMrgnlendStore, useUiStore } from "~/store";
import {
  closeBalance,
  executeLendingAction,
  cn,
  capture,
  executeLstAction,
  getBlockedActions,
  executeLoopingAction,
  createAccountAction,
} from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { SOL_MINT } from "~/store/lstStore";

import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";
import { checkActionAvailable } from "~/utils/actionBoxUtils";
import { IconAlertTriangle, IconExternalLink, IconSettings } from "~/components/ui/icons";
import { showErrorToast } from "~/utils/toastUtils";

import {
  ActionBoxPreview,
  ActionBoxSettings,
  ActionBoxActions,
  ActionBoxInput,
} from "~/components/common/ActionBox/components";
import { Button } from "~/components/ui/button";
import { ActionMethod, MarginfiActionParams, RepayType } from "@mrgnlabs/mrgn-utils";

type ActionBoxWrapperProps = {
  children: React.ReactNode;
};

export const ActionBoxWrapper = ({ children }: ActionBoxWrapperProps) => {
  const [showSettingsDialog, setShowSettingsDialog] = React.useState<boolean>(false);

  const isActionDisabled = React.useMemo(() => {
    const blockedActions = getBlockedActions();

    if (blockedActions?.find((value) => value === actionMode)) return true;

    return false;
  }, [actionMode]);

  if (isActionDisabled) {
    return (
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "p-4 md:p-6 bg-background-gray text-white w-full max-w-[480px] rounded-lg relative",
            isDialog && "py-5 border border-background-gray-light/50"
          )}
        >
          Action is temporary disabled. <br /> Visit our socials for more information.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "p-2 md:p-3 bg-background-gray text-white w-full max-w-[480px] rounded-lg relative",
            isDialog && "py-5 border border-background-gray-light/50"
          )}
        >
          {showSettingsDialog ? (
            <ActionBoxSettings
              repayMode={repayMode}
              actionMode={actionMode}
              toggleSettings={setIsSettingsMode}
              setSlippageBps={(value) => setSlippageBps(value * 100)}
              slippageBps={slippageBps / 100}
            />
          ) : (
            { children }
          )}
        </div>
      </div>
    </>
  );
};
