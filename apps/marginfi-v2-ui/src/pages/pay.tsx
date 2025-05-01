import React from "react";
import { useWallet, WalletButton } from "@mrgnlabs/mrgn-ui";
import { useConnection, useAuth } from "@mrgnlabs/mrgn-utils";
import { Button } from "~/components/ui/button";

export default function PayPage() {
  const { wallet, connected } = useWallet();
  const { connection } = useConnection();
  const { authenticateUser, user, isAuthenticating } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full">
      {user ? (
        <div className="flex flex-col items-center justify-center">{user.id}</div>
      ) : connected ? (
        <Button onClick={() => authenticateUser(wallet, connection)} disabled={isAuthenticating}>
          {isAuthenticating ? "Authenticating..." : "Login"}
        </Button>
      ) : (
        <WalletButton />
      )}
    </div>
  );
}
