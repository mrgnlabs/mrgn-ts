import React from "react";

import { useWalletContext } from "~/hooks/useWalletContext";

import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { useMrgnlendStore } from "~/store";

import { PageHeader } from "~/components/common/PageHeader";
import { WalletButton } from "~/components/common/Wallet";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";
import { Button } from "~/components/ui/button";
import { Alert, AlertTitle } from "~/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { IconAlertTriangle, IconTransfer, IconX } from "~/components/ui/icons";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "~/components/ui/select";

export default function MigratePage() {
  const { connected, wallet } = useWalletContext();
  const [fetchMrgnlendState, isRefreshingStore, setIsRefreshingStore, initialized, marginfiAccounts, selectedAccount] =
    useMrgnlendStore((state) => [
      state.fetchMrgnlendState,
      state.isRefreshingStore,
      state.setIsRefreshingStore,
      state.initialized,
      state.marginfiAccounts,
      state.selectedAccount,
    ]);
  const [chosenAccount, setChosenAccount] = React.useState<MarginfiAccountWrapper | null>(null);

  React.useEffect(() => {
    if (marginfiAccounts.length === 1 && !chosenAccount) {
      setChosenAccount(marginfiAccounts[0]);
    }
  }, [marginfiAccounts]);

  return (
    <>
      <PageHeader>Migrate Account</PageHeader>
      {!initialized && <Loader label="Loading account migration..." className="mt-16" />}
      {initialized && (
        <div className="w-full h-full px-4 pt-16">
          {!connected && (
            <div className="flex flex-col items-center gap-6">
              <p className="text-lg">Please connect your wallet to migrate your account</p>
              <WalletButton />
            </div>
          )}

          {connected && !chosenAccount && (
            <div className="flex flex-col items-center max-w-md mx-auto">
              <header className="space-y-4 text-center">
                <h1 className="text-3xl font-medium">Migrate your marginfi account</h1>
                <p>
                  There are multiple accounts associated with your wallet address. Please ensure the correct account is
                  selected before migrating.
                </p>
              </header>

              <div className="flex items-center justify-center gap-2 mt-8">
                <p className="text-sm font-normal">Select account:</p>
                <Select
                  value={selectedAccount ? selectedAccount.address.toBase58() : ""}
                  disabled={isRefreshingStore}
                  onValueChange={(value) => {
                    setIsRefreshingStore(true);
                    localStorage.setItem("mfiAccount", value);
                    fetchMrgnlendState();
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    {isRefreshingStore
                      ? "Loading..."
                      : selectedAccount
                      ? shortenAddress(selectedAccount.address.toBase58())
                      : ""}
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectGroup>
                      <SelectLabel>Accounts</SelectLabel>
                      {marginfiAccounts.map((account, index) => (
                        <SelectItem key={index} value={account.address.toBase58()} className="!text-xs">
                          {account.address.toBase58()}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setChosenAccount(selectedAccount);
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {connected && chosenAccount && selectedAccount && (
            <div className="flex flex-col items-center max-w-md mx-auto">
              <header className="space-y-4 text-center">
                <h1 className="text-3xl font-medium">Migrate your marginfi account</h1>
                <p>
                  Account migration will transfer full ownership of the specified marginfi account to a new wallet
                  address.
                </p>
              </header>
              <Alert variant="destructive" className="mt-8 mb-12">
                <IconAlertTriangle size={18} />
                <AlertTitle>Proceed with caution</AlertTitle>
              </Alert>
              <div className="space-y-8 w-full flex flex-col items-center text-muted-foreground">
                <ul className="w-full space-y-2">
                  <li className="flex items-center justify-between gap-2">
                    Migrating Account:
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-default text-white text-sm">
                          <>{shortenAddress(selectedAccount?.address.toBase58())}</>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-none">
                          <p>{selectedAccount?.address.toBase58()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    From:
                    <Badge variant="secondary" className="ml-auto">
                      connected
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-default text-white text-sm">
                          <>{shortenAddress(wallet.publicKey.toBase58())}</>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-none">
                          <p>{wallet.publicKey.toBase58()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                  <li className="flex items-center justify-between gap-8">
                    To:
                    <Input type="text" placeholder="Wallet address" />
                  </li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Button>
                    <IconTransfer size={20} /> Migrate Account
                  </Button>

                  {marginfiAccounts.length > 1 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-destructive-foreground gap-1"
                      onClick={() => {
                        setChosenAccount(null);
                      }}
                    >
                      <IconX size={16} /> Cancel Migration
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
