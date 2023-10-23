import React from "react";
import Image from "next/image";
import { Button, Dialog, DialogContent } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3Auth } from "~/hooks/useWeb3Auth";

export const WalletButtonNew = () => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { select, wallets } = useWallet();
  const { connected, wallet, logout } = useWalletContext();
  const { login } = useWeb3Auth();
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (connected) {
      setDialogOpen(false);
    }
  }, [connected]);

  return (
    <div>
      {!connected ? (
        <Button onClick={() => setDialogOpen(true)}>Connect</Button>
      ) : (
        <Button onClick={() => logout()}>
          <>{wallet?.publicKey ? shortenAddress(wallet.publicKey.toString()) : "Disconnect"}</>
        </Button>
      )}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xl"
        PaperProps={{
          style: {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        }}
      >
        <DialogContent className="bg-[#171C1F] w-full rounded-lg text-white items-center justify-center text-center py-16">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login("email_passwordless", { login_hint: emailInputRef.current?.value });
            }}
          >
            <input ref={emailInputRef} type="email" placeholder="Email address" className="text-black" />
            <Button type="submit">Login</Button>
          </form>

          <ul>
            <li>
              <Button onClick={() => login("google")}>Google</Button>
            </li>
            <li>
              <Button onClick={() => login("twitter")}>Twitter</Button>
            </li>
            <li>
              <Button onClick={() => login("apple")}>Apple</Button>
            </li>
          </ul>

          {wallets.filter((wallet) => wallet.readyState === "Installed").length > 0 && (
            <ul>
              {wallets
                .filter((wallet) => wallet.readyState === "Installed")
                .map((wallet, i) => (
                  <li key={i}>
                    <Button
                      key={wallet.adapter.name}
                      onClick={() => {
                        select(wallet.adapter.name);
                        setDialogOpen(false);
                      }}
                    >
                      <Image src={wallet.adapter.icon} alt={wallet.adapter.name} height={10} width={10} />
                      {wallet.adapter.name}
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
