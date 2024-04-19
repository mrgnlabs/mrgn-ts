import React from "react";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { useMrgnlendStore } from "~/store";

import { cn } from "~/utils/themeUtils";

import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { Badge } from "~/components/ui/badge";

export const WalletAuthAccounts = () => {
  const [isActivatingAccount, setIsActivatingAccount] = React.useState<number | null>(null);
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
      const timer = setTimeout(() => setIsActivatingAccount(index), 500);
      localStorage.setItem("mfiAccount", account.address.toBase58());
      await fetchMrgnlendState();
      clearTimeout(timer);
      setIsActivatingAccount(null);

      return () => clearTimeout(timer);
    },
    [fetchMrgnlendState]
  );

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
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Your accounts</h4>
              <p className="text-sm text-muted-foreground">Select your marginfi account below.</p>
            </div>
            <div
              className={cn(
                "grid gap-2 transition-opacity",
                isActivatingAccount !== null && "pointer-events-none animate-pulsate"
              )}
            >
              {marginfiAccounts.map((account, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="justify-start gap-4 px-2"
                  onClick={() => activateAccount(account, index)}
                >
                  <Label htmlFor="width">Account {index + 1}</Label>
                  <span className="text-muted-foreground text-xs">{shortenAddress(account.address.toBase58())}</span>
                  {isActivatingAccount === null &&
                    selectedAccount &&
                    selectedAccount.address.equals(account.address) && (
                      <Badge className="text-xs p-1 h-5">active</Badge>
                    )}
                  {isActivatingAccount === index && (
                    <span className="text-xs text-muted-foreground/50">switching...</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
