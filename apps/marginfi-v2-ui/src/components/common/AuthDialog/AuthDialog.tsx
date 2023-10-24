import React from "react";
import { Dialog, DialogContent } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { AiOutlineGoogle, AiOutlineTwitter, AiFillApple } from "react-icons/ai";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Web3AuthSocialProvider } from "~/hooks/useWeb3AuthWallet";
import {
  AuthDialogTriggerButton,
  AuthDialogSocialButton,
  AuthDialogWalletButton,
  AuthDialogEmailForm,
} from "~/components/common/AuthDialog";

const socialProviders: {
  name: Web3AuthSocialProvider;
  image: React.ReactNode;
}[] = [
  {
    name: "google",
    image: <AiOutlineGoogle />,
  },
  {
    name: "twitter",
    image: <AiOutlineTwitter />,
  },
  {
    name: "apple",
    image: <AiFillApple />,
  },
];

export const AuthDialog = () => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { select, wallets } = useWallet();
  const { connected, logout, login } = useWalletContext();

  React.useEffect(() => {
    if (connected) {
      setDialogOpen(false);
    }
  }, [connected]);

  return (
    <div>
      <AuthDialogTriggerButton connected={connected} onConnect={() => setDialogOpen(true)} onDisconnect={logout} />
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
        <DialogContent className="bg-[#171C1F] w-full rounded-lg text-white items-center justify-center text-center p-8">
          <AuthDialogEmailForm onSubmit={(email) => login("email_passwordless", { login_hint: email })} />

          <ul className="mt-8 flex flex-col gap-2">
            {socialProviders.map((provider, i) => (
              <li className="flex" key={i}>
                <AuthDialogSocialButton
                  provider={provider.name}
                  image={provider.image}
                  onClick={() => login(provider.name)}
                />
              </li>
            ))}
          </ul>

          {wallets.filter((wallet) => wallet.readyState === "Installed").length > 0 && (
            <ul className="mt-8 flex flex-col gap-2">
              {wallets
                .filter((wallet) => wallet.readyState === "Installed")
                .map((wallet, i) => (
                  <li key={i}>
                    <AuthDialogWalletButton
                      name={wallet.adapter.name}
                      image={wallet.adapter.icon}
                      onClick={() => {
                        select(wallet.adapter.name);
                        setDialogOpen(false);
                      }}
                    />
                  </li>
                ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
