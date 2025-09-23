import React from "react";

import { MarginfiAccountWrapper, MarginfiClient, ProcessTransactionsClientOpts } from "@mrgnlabs/marginfi-client-v2";
import { getMaybeSquadsOptions, capture } from "@mrgnlabs/mrgn-utils";
import { toastManager } from "@mrgnlabs/mrgn-toasts";
import { IconChevronDown, IconUserPlus, IconCopy, IconCheck } from "@tabler/icons-react";
import { Connection, PublicKey } from "@solana/web3.js";
import CopyToClipboard from "react-copy-to-clipboard";

import { cn } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "~/components/wallet-v2";

import { Button } from "~/components/ui/button";
import { IconLoader } from "~/components/ui/icons";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { Badge } from "~/components/ui/badge";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";

enum WalletAuthAccountsState {
  DEFAULT = "DEFAULT",
  ADD_ACCOUNT = "ADD_ACCOUNT",
}

type WalletAuthAccountsProps = {
  mfiClient: MarginfiClient | null;
  connection: Connection | null;
  marginfiAccounts: PublicKey[];
  selectedAccount: MarginfiAccountWrapper | null;
  setSelectedAccount: (account: PublicKey) => void;
  processOpts?: ProcessTransactionsClientOpts;
  closeOnSwitch?: boolean;
  fullHeight?: boolean;
  popoverContentAlign?: "start" | "end" | "center";
  showAddAccountButton?: boolean;
};

export const WalletAuthAccounts = ({
  mfiClient,
  connection,
  marginfiAccounts,
  selectedAccount,
  setSelectedAccount,
  closeOnSwitch = false,
  fullHeight = false,
  popoverContentAlign = "center",
  showAddAccountButton = true,
  processOpts,
}: WalletAuthAccountsProps) => {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const { wallet, walletAddress, walletContextState } = useWallet();
  const [isActivatingAccount, setIsActivatingAccount] = React.useState<number | null>(null);
  const [isActivatingAccountDelay, setIsActivatingAccountDelay] = React.useState<number | null>(null);
  const [walletAuthAccountsState, setWalletAuthAccountsState] = React.useState<WalletAuthAccountsState>(
    WalletAuthAccountsState.DEFAULT
  );
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [copiedAddresses, setCopiedAddresses] = React.useState<Set<string>>(new Set());

  const handleCopyAddress = React.useCallback((address: string) => {
    setCopiedAddresses((prev) => new Set(prev).add(address));
    setTimeout(() => {
      setCopiedAddresses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(address);
        return newSet;
      });
    }, 1000);
  }, []);

  const activateAccount = React.useCallback(
    (account: PublicKey, index: number) => {
      if (selectedAccount && selectedAccount.address.equals(account)) return;
      setIsActivatingAccount(index);
      const switchingLabelTimer = setTimeout(() => setIsActivatingAccountDelay(index), 500);
      setSelectedAccount(account);

      clearTimeout(switchingLabelTimer);
      setIsActivatingAccount(null);
      setIsActivatingAccountDelay(null);
      capture("account_switched", { wallet: walletAddress.toBase58(), account: account.toBase58() });

      if (closeOnSwitch) {
        setPopoverOpen(false);
      }

      return () => clearTimeout(switchingLabelTimer);
    },
    [selectedAccount, setSelectedAccount, walletAddress, closeOnSwitch]
  );

  const createNewAccount = React.useCallback(async () => {
    if (!connection || !mfiClient || !wallet.publicKey) {
      return;
    }

    const multiStepToast = toastManager.createMultiStepToast("Create new account", [{ label: "Creating account" }]);
    multiStepToast.start();
    setIsSubmitting(true);

    try {
      const squadsOptions = await getMaybeSquadsOptions(walletContextState);
      const mfiAccount = await mfiClient.createMarginfiAccount(squadsOptions, processOpts);

      if (!mfiAccount) {
        multiStepToast.setFailed("Error creating new account");
        setIsSubmitting(false);
        return;
      }

      multiStepToast.successAndNext();
      setIsSubmitting(false);
      setWalletAuthAccountsState(WalletAuthAccountsState.DEFAULT);
      activateAccount(mfiAccount.address, marginfiAccounts.length);

      capture("account_created", {
        wallet: mfiAccount.authority.toBase58(),
        account: mfiAccount.address.toBase58(),
      });
    } catch (error) {
      multiStepToast.setFailed("Error creating new account");
      setIsSubmitting(false);
    }
  }, [connection, mfiClient, wallet, walletContextState, processOpts, activateAccount, marginfiAccounts]);

  return (
    <div>
      <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
        {selectedAccount && (
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="text-sm">
              <span className="max-w-[80px] lg:max-w-[120px] truncate">
                Account {marginfiAccounts.findIndex((acc) => acc.equals(selectedAccount.address)) + 1}
              </span>
              <IconChevronDown size={16} />
            </Button>
          </PopoverTrigger>
        )}
        <PopoverContent className="w-80 z-50" align={popoverContentAlign}>
          {walletAuthAccountsState === WalletAuthAccountsState.DEFAULT && (
            <div className="grid gap-4 w-[80]">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Your accounts</h4>
                <p className="text-sm text-muted-foreground">
                  {marginfiAccounts.length === 1
                    ? "Create another account below."
                    : "Select an account or create a new one below."}
                </p>
              </div>
              <div
                className={cn(
                  "grid gap-2 max-h-[246px] overflow-y-auto relative",
                  fullHeight && "max-h-[calc(100vh-340px)]",
                  isActivatingAccount !== null && "pointer-events-none animate-pulsate"
                )}
              >
                {marginfiAccounts.map((account, index) => {
                  const isActiveAccount = selectedAccount && selectedAccount.address.equals(account);
                  const accountLabel = `Account ${index + 1}`;
                  return (
                    <div key={account.toBase58()} className="flex items-center justify-start gap-2">
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start pl-2 outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
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
                              <Label
                                htmlFor="width"
                                className={cn(
                                  "pr-4 truncate overflow-hidden text-left",
                                  !isActiveAccount && "cursor-pointer"
                                )}
                              >
                                {accountLabel}
                              </Label>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{accountLabel}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <span id={account.toBase58()} className="text-muted-foreground text-[10px]">
                          {isActivatingAccountDelay === index ? "Switching..." : shortenAddress(account.toBase58())}
                        </span>

                        {isActivatingAccount === null && isActiveAccount && (
                          <Badge className="text-xs p-1 h-5">active</Badge>
                        )}
                      </Button>

                      <div className="flex items-center ml-auto">
                        <div
                          className="cursor-pointer flex py-2 px-1.5 items-center justify-center transition-colors rounded-md hover:bg-background-gray-light"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  {copiedAddresses.has(account.toBase58()) ? (
                                    <IconCheck size={16} />
                                  ) : (
                                    <CopyToClipboard
                                      text={account.toBase58()}
                                      onCopy={() => handleCopyAddress(account.toBase58())}
                                    >
                                      <IconCopy size={16} />
                                    </CopyToClipboard>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {copiedAddresses.has(account.toBase58()) ? "Copied!" : "Copy account address"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {showAddAccountButton && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setWalletAuthAccountsState(WalletAuthAccountsState.ADD_ACCOUNT);
                  }}
                >
                  <IconUserPlus size={16} className="mr-2" />
                  Add account
                </Button>
              )}
            </div>
          )}

          {walletAuthAccountsState === WalletAuthAccountsState.ADD_ACCOUNT && (
            <div className={cn("grid gap-4", isSubmitting && "pointer-events-none animate-pulsate")}>
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Your accounts</h4>
                <p className="text-sm text-muted-foreground">Create a new marginfi account.</p>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={createNewAccount}
                disabled={isSubmitting}
              >
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
                  onClick={() => {
                    setWalletAuthAccountsState(WalletAuthAccountsState.DEFAULT);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
