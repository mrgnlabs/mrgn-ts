import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AiOutlineGoogle, AiOutlineTwitter, AiFillApple } from "react-icons/ai";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Web3AuthSocialProvider } from "~/hooks/useWeb3AuthWallet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
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
      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogTrigger>
          <AuthDialogTriggerButton connected={connected} onConnect={() => setDialogOpen(true)} onDisconnect={logout} />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove your data from our
              servers.
            </DialogDescription>
          </DialogHeader>

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
