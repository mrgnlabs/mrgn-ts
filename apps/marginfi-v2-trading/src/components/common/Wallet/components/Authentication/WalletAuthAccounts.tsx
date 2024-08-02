import React from "react";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { clearAccountCache, firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useTradeStore } from "~/store";

import { cn } from "~/utils/themeUtils";
import { MultiStepToastHandle } from "~/utils/toastUtils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { getMaybeSquadsOptions } from "~/utils/mrgnActions";
import { capture } from "~/utils";

import { Button } from "~/components/ui/button";
import { IconChevronDown, IconUserPlus, IconPencil, IconAlertTriangle, IconLoader } from "~/components/ui/icons";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";

enum WalletAuthAccountsState {
  DEFAULT = "DEFAULT",
  ADD_ACCOUNT = "ADD_ACCOUNT",
  EDIT_ACCOUNT = "EDIT_ACCOUNT",
}

export const WalletAuthAccounts = () => {
  const { wallet, walletContextState } = useWalletContext();
  const { connection } = useConnection();
  const [isActivatingAccount, setIsActivatingAccount] = React.useState<number | null>(null);
  const [isActivatingAccountDelay, setIsActivatingAccountDelay] = React.useState<number | null>(null);
  const [walletAuthAccountsState, setWalletAuthAccountsState] = React.useState<WalletAuthAccountsState>(
    WalletAuthAccountsState.DEFAULT
  );
  const [newAccountName, setNewAccountName] = React.useState<string>();
  const [editingAccount, setEditingAccount] = React.useState<MarginfiAccountWrapper | null>(null);
  const [accountLabels, setAccountLabels] = React.useState<Record<string, string>>({});
  const [editingAccountName, setEditingAccountName] = React.useState<string>("");
  const [editAccountError, setEditAccountError] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [useAuthTxn, setUseAuthTxn] = React.useState(false);
  const newAccountNameRef = React.useRef<HTMLInputElement>(null);
  const editAccountNameRef = React.useRef<HTMLInputElement>(null);

  const [initialized, mfiClient, selectedAccount, activeGroup, setActiveGroup] = useTradeStore((state) => [
    state.initialized,
    state.marginfiClient,
    state.selectedAccount,
    state.activeGroup,
    state.setActiveGroup,
  ]);

  if (!initialized || !selectedAccount) return null;

  return (
    <div className="text-sm text-center">
      <h2 className="font-medium">Account</h2>
      <Link
        href={`https://solscan.io/address/${selectedAccount.address.toBase58()}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 transition-colors hover:text-mrgn-chartreuse"
      >
        {shortenAddress(selectedAccount.address)}
        <IconExternalLink size={14} />
      </Link>
    </div>
  );
};
