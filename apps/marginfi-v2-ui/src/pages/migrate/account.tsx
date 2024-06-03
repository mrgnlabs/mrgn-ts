import React from "react";

import Link from "next/link";
import { useRouter } from "next/router";

import { PublicKey } from "@solana/web3.js";

import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { useMrgnlendStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { extractErrorString } from "~/utils/mrgnUtils";

import { WalletButton } from "~/components/common/Wallet";
import { MultiStepToastHandle } from "~/utils/toastUtils";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";
import { Button } from "~/components/ui/button";
import { Alert, AlertTitle } from "~/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { IconAlertTriangle, IconTransfer, IconX, IconLink, IconExternalLink, IconMrgn } from "~/components/ui/icons";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "~/components/ui/select";

export default function MigrateAccountPage() {
  const router = useRouter();
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
  const [isComplete, setIsComplete] = React.useState(false);
  const [txnSignature, setTxnSignature] = React.useState<string | null>(null);
  const walletAddressInputRef = React.useRef<HTMLInputElement>(null);

  const migrateAccount = React.useCallback(async () => {
    if (!selectedAccount || !walletAddressInputRef?.current?.value) return;
    const multiStepToast = new MultiStepToastHandle("Migrate Account", [{ label: "Migrating account" }]);
    multiStepToast.start();

    console.log("Migrating account...", selectedAccount.address.toBase58(), walletAddressInputRef.current.value);

    try {
      const data = await selectedAccount.transferAccountAuthority(new PublicKey(walletAddressInputRef.current.value));
      multiStepToast.setSuccessAndNext();
      localStorage.removeItem(`marginfi_accounts-${wallet.publicKey.toBase58()}`);
      localStorage.removeItem(`marginfi_accounts-${walletAddressInputRef.current.value}`);
      setTxnSignature(data);
      setIsComplete(true);
    } catch (error) {
      const errMsg = extractErrorString(error);
      console.error(errMsg);
      multiStepToast.setFailed(errMsg);
    }
  }, [selectedAccount, walletAddressInputRef, wallet.publicKey]);

  React.useEffect(() => {
    if (marginfiAccounts.length === 1 && !chosenAccount) {
      setChosenAccount(marginfiAccounts[0]);
    }
  }, [marginfiAccounts, chosenAccount]);

  return (
    <>
      {!initialized && <Loader label="Loading account migration..." className="mt-16" />}
      {initialized && (
        <div className="w-full h-full px-4">
          {!connected && (
            <div className="flex flex-col items-center gap-6">
              <p className="text-lg">Please connect your wallet to migrate your account</p>
              <WalletButton />
            </div>
          )}

          {connected && !chosenAccount && !isComplete && (
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

          {connected && chosenAccount && selectedAccount && !isComplete && (
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
              <form
                className="space-y-8 w-full flex flex-col items-center text-muted-foreground"
                onSubmit={(e) => {
                  e.preventDefault();
                  migrateAccount();
                }}
              >
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
                    <Input ref={walletAddressInputRef} required type="text" placeholder="Wallet address" />
                  </li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Button type="submit">
                    <IconTransfer size={20} /> Migrate Account
                  </Button>

                  <Button
                    variant="link"
                    size="sm"
                    className="text-destructive-foreground gap-1"
                    onClick={() => {
                      setChosenAccount(null);
                      router.push("/migrate");
                    }}
                  >
                    <IconX size={16} /> Cancel Migration
                  </Button>
                </div>
              </form>
            </div>
          )}

          {isComplete && (
            <div className="flex flex-col items-center space-y-10 max-w-3xl mx-auto">
              <div className="flex flex-col items-center space-y-8 text-center">
                <header className="space-y-2 text-center">
                  <h1 className="text-3xl font-medium">Account Migrated!</h1>
                  <p>Your marginfi account has been successfully migrated to the new wallet address.</p>
                </header>

                {txnSignature && (
                  <p className="flex items-center gap-2 leading-tight">
                    <strong className="font-medium">Txn signature:</strong>{" "}
                    <Link
                      href={`https://solscan.io/tx/${txnSignature}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-chartreuse border-b border-chartreuse transition-colors hover:border-transparent"
                    >
                      {shortenAddress(txnSignature)} <IconExternalLink size={16} />
                    </Link>
                  </p>
                )}

                <Link href="/">
                  <Button>
                    <IconMrgn size={18} /> back to mrgnlend
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
