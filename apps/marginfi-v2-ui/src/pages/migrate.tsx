import { useWalletContext } from "~/hooks/useWalletContext";

import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { useMrgnlendStore } from "~/store";

import { PageHeader } from "~/components/common/PageHeader";
import { WalletButton } from "~/components/common/Wallet";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";
import { Button } from "~/components/ui/button";
import { Alert, AlertTitle } from "~/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { IconAlertTriangle, IconTransfer } from "~/components/ui/icons";

export default function MigratePage() {
  const { connected, wallet } = useWalletContext();
  const [initialized, marginfiAccounts, selectedAccount] = useMrgnlendStore((state) => [
    state.initialized,
    state.marginfiAccounts,
    state.selectedAccount,
  ]);

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

          {connected && selectedAccount && (
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
                <Button>
                  <IconTransfer size={20} /> Migrate Account
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
