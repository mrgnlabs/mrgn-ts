import React from "react";
import Image from "next/image";
import { Button, Dialog, DialogContent } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { Magic } from "magic-sdk";
import { useWalletContext } from "~/hooks/useWalletContext";

export const WalletButtonNew = () => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { select, wallets, disconnect } = useWallet();
  const { connected, loginWithEmail } = useWalletContext();
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const handleEmailLogin = async () => {
    if (!emailInputRef.current) return;
    const email = emailInputRef.current.value;
    if (!email) return;

    await loginWithEmail(email);
  };

  return (
    <div>
      {!connected ? (
        <Button onClick={() => setDialogOpen(true)}>Connect</Button>
      ) : (
        <Button onClick={() => disconnect()}>Disconnect</Button>
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
              handleEmailLogin();
            }}
          >
            <input ref={emailInputRef} type="email" placeholder="Email address" className="text-black" />
            <Button type="submit">Login</Button>
          </form>

          {wallets.filter((wallet) => wallet.readyState === "Installed").length > 0 ? (
            <ul>
              {wallets
                .filter((wallet) => wallet.readyState === "Installed")
                .map((wallet) => (
                  <li>
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
          ) : (
            <p>No wallet found. Please download a supported Solana wallet</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
