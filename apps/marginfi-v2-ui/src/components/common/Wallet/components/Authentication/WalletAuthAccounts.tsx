import React from "react";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { useMrgnlendStore } from "~/store";

import { cn } from "~/utils/themeUtils";

import { Button } from "~/components/ui/button";
import { IconChevronDown, IconUserPlus, IconPencil, IconAlertTriangle } from "~/components/ui/icons";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";

enum WalletAuthAccountsState {
  DEFAULT = "DEFAULT",
  ADD_ACCOUNT = "ADD_ACCOUNT",
  EDIT_ACCOUNT = "EDIT_ACCOUNT",
}

export const WalletAuthAccounts = () => {
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
  const [initialized, marginfiAccounts, selectedAccount, fetchMrgnlendState] = useMrgnlendStore((state) => [
    state.initialized,
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

      return () => clearTimeout(switchingLabelTimer);
    },
    [fetchMrgnlendState, selectedAccount]
  );

  // TODO: Function to handle fetching account labels
  // if none exists then use Account {index + 1}
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

      console.log(account.address.toBase58(), accountLabelData.data.label || accountLabel);
    };

    marginfiAccounts.forEach(fetchAccountLabel);
    setNewAccountName(`Account ${marginfiAccounts.length + 1}`);
  }, [marginfiAccounts, setAccountLabels]);

  const editAccount = React.useCallback(async () => {
    if (
      !editingAccount ||
      !editingAccountName ||
      editingAccountName === accountLabels[editingAccount.address.toBase58()]
    )
      return;
    const updateAccountLabelReq = await fetch(`/api/user/account-label`, {
      method: "POST",
      body: JSON.stringify({
        account: editingAccount?.address.toBase58(),
        label: editingAccountName,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!updateAccountLabelReq.ok) {
      console.error("Error updating account label");
      setEditAccountError("Error updating account label");
      return;
    }

    setEditingAccount(null);
    setEditingAccountName("");
    setEditAccountError("");
    fetchAccountLabels();

    setWalletAuthAccountsState(WalletAuthAccountsState.DEFAULT);
  }, [editingAccount, editingAccountName, fetchAccountLabels, accountLabels]);

  // TODO: Function to handle creating new account
  // - Step 1 create new marginfi account owned by current user
  // - Step 2 add new account label in firestore with new account address
  const createNewAccount = React.useCallback(async () => {
    if (!newAccountName) return;

    const multiStepToast = new MultiStepToastHandle("Create new account", [{ label: "Creating account" }]);
    multiStepToast.start();

    let marginfiAccount: MarginfiAccountWrapper;
    try {
      const squadsOptions = await getMaybeSquadsOptions(walletContextState);
      marginfiAccount = await mfiClient.createMarginfiAccount(undefined, squadsOptions);

      clearAccountCache(mfiClient.provider.publicKey);

      multiStepToast.setSuccessAndNext();
    } catch (error: any) {
      multiStepToast.setFailed("Error creating account");
      console.log(`Error creating account`, error);
      return;
    }

    const account = "";

    const createAccountReq = await fetch(`/api/user/account`, {
      method: "POST",
      body: JSON.stringify({
        account: marginfiAccount.address.toBase58(),
        label: newAccountName,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }, [newAccountName]);

  React.useEffect(() => {
    if (!initialized) return;
    fetchAccountLabels();
  }, [initialized, fetchAccountLabels]);

  if (!initialized) return null;

  return (
    <div>
      <Popover>
        {selectedAccount && accountLabels[selectedAccount.address.toBase58()] && (
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="text-sm">
              {accountLabels[selectedAccount.address.toBase58()]} <IconChevronDown size={16} />
            </Button>
          </PopoverTrigger>
        )}
        {/* TODO: fix this z-index mess */}
        <PopoverContent className="w-80 z-[9999999]">
          {walletAuthAccountsState === WalletAuthAccountsState.DEFAULT && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Your accounts</h4>
                <p className="text-sm text-muted-foreground">Select your marginfi account below.</p>
              </div>
              <div className={cn("grid gap-2", isActivatingAccount !== null && "pointer-events-none animate-pulsate")}>
                {marginfiAccounts.map((account, index) => {
                  const isActiveAccount = selectedAccount && selectedAccount.address.equals(account.address);
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      className={cn(
                        "justify-start gap-4 pr-1 pl-2",
                        isActiveAccount && "cursor-default hover:bg-transparent"
                      )}
                      onClick={() => {
                        if (isActiveAccount) return;
                        activateAccount(account, index);
                      }}
                    >
                      <Label htmlFor="width">{accountLabels[account.address.toBase58()]}</Label>
                      <span className="text-muted-foreground text-xs">
                        {isActivatingAccountDelay === index
                          ? "Switching..."
                          : shortenAddress(account.address.toBase58())}
                      </span>
                      {isActivatingAccount === null && isActiveAccount && (
                        <Badge className="text-xs p-1 h-5">active</Badge>
                      )}
                      <div className="flex items-center ml-auto">
                        <button
                          className="p-1.5 transition-colors rounded-lg hover:bg-background-gray-light"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAccount(account);
                            setEditingAccountName(accountLabels[account.address.toBase58()]);
                            setWalletAuthAccountsState(WalletAuthAccountsState.EDIT_ACCOUNT);
                          }}
                        >
                          <IconPencil size={16} />
                        </button>
                      </div>
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setWalletAuthAccountsState(WalletAuthAccountsState.ADD_ACCOUNT)}
              >
                <IconUserPlus size={16} className="mr-2" />
                Add account
              </Button>
            </div>
          )}

          {walletAuthAccountsState === WalletAuthAccountsState.ADD_ACCOUNT && (
            <form
              className="grid gap-4"
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
                  type="text"
                  name="accountName"
                  value={newAccountName}
                  autoFocus
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" onClick={() => {}}>
                Create account
              </Button>
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
            </form>
          )}

          {walletAuthAccountsState === WalletAuthAccountsState.EDIT_ACCOUNT && (
            <form
              className="grid gap-4"
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
                  type="text"
                  name="accountName"
                  value={editingAccountName}
                  autoFocus
                  onChange={(e) => setEditingAccountName(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" onClick={() => {}}>
                Update account
              </Button>
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
            </form>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
