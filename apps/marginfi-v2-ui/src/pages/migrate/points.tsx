import React from "react";

import Link from "next/link";

import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { MultiStepToastHandle } from "~/utils/toastUtils";

import { WalletButton } from "~/components/common/Wallet";
import { Loader } from "~/components/ui/loader";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Alert, AlertTitle } from "~/components/ui/alert";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { IconAlertTriangle, IconMrgn, IconTransfer, IconX } from "~/components/ui/icons";

export default function MigratePointsPage() {
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);
  const { connected, wallet } = useWalletContext();
  const { connection } = useConnection();
  const [useAuthTxn, setUseAuthTxn] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const walletAddressInputRef = React.useRef<HTMLInputElement>(null);

  const migratePoints = React.useCallback(async () => {
    if (!walletAddressInputRef.current) return;

    const multiStepToast = new MultiStepToastHandle("Migrate Points", [{ label: "Migrating points" }]);
    multiStepToast.start();

    const blockhashInfo = await connection.getLatestBlockhash();

    try {
      const res = await firebaseApi.migratePoints(
        useAuthTxn ? "tx" : "memo",
        blockhashInfo,
        wallet,
        walletAddressInputRef.current.value
      );

      if (res.error) {
        multiStepToast.setFailed(res.error);
        return;
      }

      multiStepToast.setSuccessAndNext();
      setIsComplete(true);
    } catch (loginError: any) {
      multiStepToast.setFailed(loginError.message || "Error migrating points");
    }
  }, [wallet, walletAddressInputRef, useAuthTxn, connection]);

  return (
    <>
      {!initialized && <Loader label="Loading account migration..." className="mt-16" />}
      {initialized && (
        <div className="max-w-7xl mx-auto w-full h-full px-4">
          {!connected && (
            <div className="flex flex-col items-center gap-6">
              <p className="text-lg">Please connect your wallet to migrate your account</p>
              <WalletButton />
            </div>
          )}

          {connected && !isComplete && (
            <div className="flex flex-col items-center max-w-md mx-auto">
              <header className="space-y-4 text-center">
                <h1 className="text-3xl font-medium">Migrate your marginfi points</h1>
                <p>Points migration will transfer all your points to another wallet. This action is irreversible.</p>
              </header>
              <Alert variant="destructive" className="mt-8 mb-12">
                <IconAlertTriangle size={18} />
                <AlertTitle>Proceed with caution</AlertTitle>
              </Alert>
              <form
                className="space-y-8 w-full flex flex-col items-center text-muted-foreground"
                onSubmit={(e) => {
                  e.preventDefault();
                  migratePoints();
                }}
              >
                <ul className="w-full space-y-2">
                  <li className="flex items-center justify-between gap-2">
                    Migrating Points:
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
                <div className="flex flex-col items-center gap-4">
                  <Label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={useAuthTxn} onCheckedChange={(checked) => setUseAuthTxn(checked as boolean)} />
                    Using Ledger?
                  </Label>
                  <div className="flex flex-col gap-2">
                    <Button type="submit">
                      <IconTransfer size={20} /> Migrate Points
                    </Button>

                    <Link href="/migrate" className="text-center">
                      <Button variant="link" size="sm" className="text-destructive-foreground gap-1">
                        <IconX size={16} /> Cancel Migration
                      </Button>
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          )}

          {isComplete && (
            <div className="flex flex-col items-center space-y-10 max-w-3xl mx-auto">
              <div className="flex flex-col items-center space-y-8 text-center">
                <header className="space-y-3 text-center">
                  <h1 className="text-3xl font-medium">Points queued for migration!</h1>
                  <p>Your marginfi points have been successfully queued for migration. Please check back in an hour.</p>
                </header>

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
