import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AiOutlineTwitter, AiFillApple } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
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
    image: <FcGoogle className="text-xl" />,
  },
  {
    name: "twitter",
    image: <AiOutlineTwitter className="text-xl fill-[#1da1f2]" />,
  },
  {
    name: "apple",
    image: <AiFillApple className="text-xl fill-[#a2aaad]" />,
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
            <DialogTitle>Sign in to marginfi</DialogTitle>
            <DialogDescription>
              Commodo labore reprehenderit dolore est Lorem id eu consectetur. Magna deserunt ipsum enim ad nulla enim
              voluptate qui esse cupidatat.
            </DialogDescription>
          </DialogHeader>

          <AuthDialogEmailForm onSubmit={(email) => login("email_passwordless", { login_hint: email })} />

          <div className="my-4 flex items-center justify-center text-sm">
            <hr className="flex-grow border-gray-300 dark:border-gray-700" />
            <span className="px-2 text-gray-500 dark:text-gray-400">or sign in with</span>
            <hr className="flex-grow border-gray-300 dark:border-gray-700" />
          </div>

          <ul className="flex flex-col gap-2 w-full">
            {socialProviders.map((provider, i) => (
              <li className="flex flex-col" key={i}>
                <AuthDialogSocialButton
                  provider={provider.name}
                  image={provider.image}
                  onClick={() => login(provider.name)}
                />
              </li>
            ))}
          </ul>

          <div className="my-4 flex items-center justify-center text-sm">
            <hr className="flex-grow border-gray-300 dark:border-gray-700" />
            <span className="px-2 text-gray-500 dark:text-gray-400">or connect wallet</span>
            <hr className="flex-grow border-gray-300 dark:border-gray-700" />
          </div>

          {wallets.filter((wallet) => wallet.readyState === "Installed").length > 0 && (
            <ul className="flex flex-col gap-2">
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
