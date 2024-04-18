import React from "react";

import { useMrgnlendStore } from "~/store";

import { Button } from "~/components/ui/button";
import { IconChevronDown } from "~/components/ui/icons";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { Badge } from "~/components/ui/badge";

export const WalletAuthAccounts = () => {
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
