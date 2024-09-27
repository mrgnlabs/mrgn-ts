import React from "react";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { clearAccountCache, firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";
import { getMaybeSquadsOptions, MultiStepToastHandle } from "@mrgnlabs/mrgn-utils";

import { useMrgnlendStore } from "~/store";

import { cn } from "~/utils/themeUtils";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { useConnection } from "~/hooks/use-connection";
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

enum WalletAuthAccountsState {
  DEFAULT = "DEFAULT",
  ADD_ACCOUNT = "ADD_ACCOUNT",
  EDIT_ACCOUNT = "EDIT_ACCOUNT",
}

export const WalletAuthAccounts = () => {
  const { wallet, walletContextState } = useWallet();
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

  const [initialized, mfiClient, marginfiAccounts, selectedAccount, fetchMrgnlendState] = useMrgnlendStore((state) => [
    state.initialized,
    state.marginfiClient,
    state.marginfiAccounts,
    state.selectedAccount,
    state.fetchMrgnlendState,
  ]);

  const activateAccount = React.useCallback(
    async (account: MarginfiAccountWrapper, index: number) => {
      if (selectedAccount && selectedAccount.address.equals(account.address)) return;
      setIsActivatingAccount(index);
      const switchingLabelTimer = setTimeout(() => setIsActivatingAccountDelay(index), 500);

      localStorage.setItem("mfiAccount", account.address.toBase58());
      await fetchMrgnlendState();

      clearTimeout(switchingLabelTimer);
      setIsActivatingAccount(null);
      setIsActivatingAccountDelay(null);
      capture("account_switched", { wallet: account.authority.toBase58(), account: account.address.toBase58() });

      return () => clearTimeout(switchingLabelTimer);
    },
    [fetchMrgnlendState, selectedAccount]
  );

  const fetchAccountLabels = React.useCallback(async () => {
    const fetchAccountLabel = async (account: MarginfiAccountWrapper) => {
      const accountLabelReq = await fetch(`/api/user/account-label?account=${account.address.toBase58()}`);

      if (!accountLabelReq.ok) {
        console.error("Error fetching account labels");
        return;
      }

      const accountLabelData = await accountLabelReq.json();
      let accountLabel = `Account ${marginfiAccounts.findIndex((acc) => acc.address.equals(account.address)) + 1}`;

      setAccountLabels((prev) => ({
        ...prev,
        [account.address.toBase58()]: accountLabelData.data.label || accountLabel,
      }));
    };

    marginfiAccounts.forEach(fetchAccountLabel);
  }, [marginfiAccounts, setAccountLabels]);

  const checkAndClearAccountCache = React.useCallback(() => {
    const cacheTimestamp = localStorage.getItem("mrgnClearedAccountCache");
    const now = Date.now();
    const FIFTEEN_MINUTES = 15 * 60 * 1000; // 15 minutes in milliseconds

    if (!cacheTimestamp || now - parseInt(cacheTimestamp, 10) > FIFTEEN_MINUTES) {
      console.log("Clearing account cache and refetching accounts");
      clearAccountCache(wallet.publicKey);
      fetchAccountLabels();
      localStorage.setItem("mrgnClearedAccountCache", now.toString());
    }
  }, [wallet.publicKey, fetchAccountLabels]);

  const editAccount = React.useCallback(async () => {
    if (
      !editingAccount ||
      !editingAccountName ||
      editingAccountName === accountLabels[editingAccount.address.toBase58()]
    ) {
      return;
    }

    setIsSubmitting(true);

    editAccountNameRef.current?.blur();

    const multiStepToast = new MultiStepToastHandle("Edit account", [{ label: "Updating account label" }]);
    multiStepToast.start();

    const blockhashInfo = await connection.getLatestBlockhash();

    const res = await firebaseApi.setAccountLabel(
      useAuthTxn ? "tx" : "memo",
      blockhashInfo,
      wallet,
      editingAccount.address.toBase58(),
      editingAccountName
    );

    if (!res) {
      multiStepToast.setFailed("Error updating account label");
      setIsSubmitting(false);
      return;
    }

    multiStepToast.setSuccessAndNext();
    setIsSubmitting(false);
    setEditingAccount(null);
    setEditingAccountName("");
    setEditAccountError("");
    fetchAccountLabels();

    setWalletAuthAccountsState(WalletAuthAccountsState.DEFAULT);

    capture("account_label_updated", {
      wallet: editingAccount.authority.toBase58(),
      account: editingAccount.address.toBase58(),
      label: editingAccountName,
    });
  }, [editingAccount, editingAccountName, fetchAccountLabels, accountLabels, connection, wallet, useAuthTxn]);

  const createNewAccount = React.useCallback(async () => {
    if (!newAccountName || !mfiClient || !wallet.publicKey || newAccountName.length > 20) {
      return;
    }

    newAccountNameRef.current?.blur();

    const multiStepToast = new MultiStepToastHandle("Create new account", [
      { label: "Creating account" },
      { label: "Updating account label" },
    ]);
    multiStepToast.start();
    setIsSubmitting(true);

    const squadsOptions = await getMaybeSquadsOptions(walletContextState);
    const mfiAccount = await mfiClient.createMarginfiAccount(undefined, squadsOptions);

    if (!mfiAccount) {
      multiStepToast.setFailed("Error creating new account");
      setIsSubmitting(false);
      return;
    }

    clearAccountCache(mfiClient.provider.publicKey);
    multiStepToast.setSuccessAndNext();

    const blockhashInfo = await connection.getLatestBlockhash();

    const res = await firebaseApi.setAccountLabel(
      useAuthTxn ? "tx" : "memo",
      blockhashInfo,
      wallet,
      mfiAccount.address.toBase58(),
      newAccountName
    );

    if (!res) {
      multiStepToast.setFailed("Error creating account label");
      setIsSubmitting(false);
      return;
    }

    multiStepToast.setSuccessAndNext();
    setIsSubmitting(false);
    setWalletAuthAccountsState(WalletAuthAccountsState.DEFAULT);
    await fetchAccountLabels();
    activateAccount(mfiAccount, marginfiAccounts.length - 1);
    setNewAccountName(`Account ${marginfiAccounts.length + 1}`);

    capture("account_created", {
      wallet: mfiAccount.authority.toBase58(),
      account: mfiAccount.address.toBase58(),
      label: newAccountName,
    });
  }, [
    newAccountName,
    mfiClient,
    walletContextState,
    fetchAccountLabels,
    marginfiAccounts,
    activateAccount,
    connection,
    wallet,
    useAuthTxn,
  ]);

  React.useEffect(() => {
    if (!initialized) return;
    fetchAccountLabels();
  }, [initialized, fetchAccountLabels]);

  if (!initialized) return null;

  return (
    <div>
      <Popover
        onOpenChange={(open) => {
          if (open) {
            checkAndClearAccountCache();
          }
        }}
      >
        {selectedAccount && accountLabels[selectedAccount.address.toBase58()] && (
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="text-sm">
              <span className="max-w-[80px] lg:max-w-[120px] truncate">
                {accountLabels[selectedAccount.address.toBase58()]}
              </span>{" "}
              <IconChevronDown size={16} />
            </Button>
          </PopoverTrigger>
        )}
        {/* TODO: fix this z-index mess */}
        <PopoverContent className="w-80 z-50">
          {walletAuthAccountsState === WalletAuthAccountsState.DEFAULT && (
            <div className="grid gap-4 w-[80]">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Your accounts</h4>
                <p className="text-sm text-muted-foreground">Select your marginfi account below.</p>
              </div>
              <div className={cn("grid gap-2", isActivatingAccount !== null && "pointer-events-none animate-pulsate")}>
                {marginfiAccounts.map((account, index) => {
                  const isActiveAccount = selectedAccount && selectedAccount.address.equals(account.address);
                  const accountLabel = accountLabels[account.address.toBase58()] || `Account ${index + 1}`;
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-4 pr-1 pl-2",
                        isActiveAccount && "cursor-default hover:bg-transparent"
                      )}
                      onClick={() => {
                        if (isActiveAccount) return;
                        activateAccount(account, index);
                      }}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="width" className="md:w-[97px] truncate overflow-hidden text-left">
                              {accountLabel}
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{accountLabel}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <span className="text-muted-foreground text-[10px]">
                        {isActivatingAccountDelay === index
                          ? "Switching..."
                          : shortenAddress(account.address.toBase58())}
                      </span>

                      {isActivatingAccount === null && isActiveAccount && (
                        <Badge className="text-xs p-1 h-5">active</Badge>
                      )}

                      <div className="flex items-center ml-auto">
                        <div
                          className="p-1.5 transition-colors rounded-lg hover:bg-background-gray-light"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAccount(account);
                            setEditingAccountName(accountLabels[account.address.toBase58()]);
                            setWalletAuthAccountsState(WalletAuthAccountsState.EDIT_ACCOUNT);
                          }}
                        >
                          <IconPencil size={16} />
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (!newAccountName) {
                    setNewAccountName(`Account ${marginfiAccounts.length + 1}`);
                  }
                  setWalletAuthAccountsState(WalletAuthAccountsState.ADD_ACCOUNT);
                }}
              >
                <IconUserPlus size={16} className="mr-2" />
                Add account
              </Button>
            </div>
          )}

          {walletAuthAccountsState === WalletAuthAccountsState.ADD_ACCOUNT && (
            <form
              className={cn("grid gap-4", isSubmitting && "pointer-events-none animate-pulsate")}
              onSubmit={(e) => {
                e.preventDefault();
                createNewAccount();
              }}
            >
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Your accounts</h4>
                <p className="text-sm text-muted-foreground">Create a new marginfi account.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountName" className="font-medium">
                  Account name
                </Label>
                <Input
                  ref={newAccountNameRef}
                  type="text"
                  name="accountName"
                  value={newAccountName}
                  autoFocus
                  onChange={(e) => {
                    if (e.target.value.length > 20) return;
                    setNewAccountName(e.target.value);
                  }}
                  maxLength={20}
                />
              </div>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox checked={useAuthTxn} onCheckedChange={(checked) => setUseAuthTxn(checked as boolean)} />
                Using Ledger?
              </Label>
              <Button type="submit" className="w-full" onClick={() => {}} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <IconLoader size={16} /> Creating account...
                  </>
                ) : (
                  <>Create account</>
                )}
              </Button>
              {!isSubmitting && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-destructive-foreground h-5"
                  onClick={(e) => {
                    e.preventDefault();
                    setWalletAuthAccountsState(WalletAuthAccountsState.DEFAULT);
                  }}
                >
                  Cancel
                </Button>
              )}
            </form>
          )}

          {walletAuthAccountsState === WalletAuthAccountsState.EDIT_ACCOUNT && (
            <form
              className={cn("grid gap-4", isSubmitting && "pointer-events-none animate-pulsate")}
              onSubmit={(e) => {
                e.preventDefault();
                editAccount();
              }}
            >
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Your accounts</h4>
                <p className="text-sm text-muted-foreground">Edit your marginfi account.</p>
              </div>
              {editAccountError && (
                <p className="flex items-center gap-2 bg-destructive p-2 text-destructive-foreground text-xs rounded-lg">
                  <IconAlertTriangle size={16} /> {editAccountError}
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="accountName" className="font-medium">
                  Account name
                </Label>
                <Input
                  ref={editAccountNameRef}
                  type="text"
                  name="accountName"
                  value={editingAccountName}
                  onChange={(e) => setEditingAccountName(e.target.value)}
                  autoFocus
                  maxLength={20}
                />
              </div>
              <Label className="flex items-center gap-2 text-sm">
                <Checkbox checked={useAuthTxn} onCheckedChange={(checked) => setUseAuthTxn(checked as boolean)} />
                Using Ledger?
              </Label>
              <Button type="submit" className="w-full">
                {isSubmitting ? (
                  <>
                    <IconLoader size={16} /> Updating account...
                  </>
                ) : (
                  <>Update account</>
                )}
              </Button>

              {!isSubmitting && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-destructive-foreground h-5"
                  onClick={(e) => {
                    e.preventDefault();
                    setWalletAuthAccountsState(WalletAuthAccountsState.DEFAULT);
                  }}
                >
                  Cancel
                </Button>
              )}
            </form>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
