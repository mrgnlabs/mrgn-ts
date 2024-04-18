import React from "react";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { useMrgnlendStore } from "~/store";

import { cn } from "~/utils/themeUtils";

import { Button } from "~/components/ui/button";
import { IconChevronDown, IconUserPlus } from "~/components/ui/icons";
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
  const [newAccountName, setNewAccountName] = React.useState<string>("");
  const [initialized, marginfiAccounts, selectedAccount, fetchMrgnlendState] = useMrgnlendStore((state) => [
    state.initialized,
    state.marginfiAccounts,
    state.selectedAccount,
    state.fetchMrgnlendState,
  ]);

  const activeAccountLabel = React.useMemo(() => {
    if (!selectedAccount) return null;
    const index = marginfiAccounts.findIndex((account) => account.address.equals(selectedAccount.address));
    return `Account ${index + 1}`;
  }, [selectedAccount, marginfiAccounts]);

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
  React.useEffect(() => {
    if (!marginfiAccounts.length) return;
    setNewAccountName(`Account ${marginfiAccounts.length + 1}`);
  }, [marginfiAccounts.length]);

  if (!initialized || !marginfiAccounts.length) return null;

  return (
    <div>
      <Popover>
        {activeAccountLabel && (
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="text-sm">
              {activeAccountLabel} <IconChevronDown size={16} />
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
              <div className="grid gap-2">
                {marginfiAccounts.map((account, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="justify-start gap-4 px-2"
                    onClick={() => {
                      localStorage.setItem("mfiAccount", account.address.toBase58());
                      fetchMrgnlendState();
                    }}
                  >
                    <Label htmlFor="width">Account {index + 1}</Label>
                    <span className="text-muted-foreground">{shortenAddress(account.address.toBase58())}</span>
                    {selectedAccount && selectedAccount.address.equals(account.address) && <Badge>active</Badge>}
                  </Button>
                ))}
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
            <div className="grid gap-4">
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
              <Button className="w-full" onClick={() => {}}>
                Create account
              </Button>
              <Button
                variant="link"
                size="sm"
                className="text-destructive-foreground h-5"
                onClick={() => {
                  setWalletAuthAccountsState(WalletAuthAccountsState.DEFAULT);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
