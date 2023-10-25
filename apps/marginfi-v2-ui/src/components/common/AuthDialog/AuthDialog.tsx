import React from "react";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { AiOutlineTwitter, AiFillApple } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";
import { Mrgn } from "~/components/common/icons/Mrgn";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Web3AuthSocialProvider, useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { AuthDialogButton, AuthDialogEmailForm } from "~/components/common/AuthDialog";

const socialProviders: {
  name: Web3AuthSocialProvider;
  image: React.ReactNode;
}[] = [
  {
    name: "google",
    image: <FcGoogle className="text-2xl" />,
  },
  {
    name: "twitter",
    image: <AiOutlineTwitter className="text-2xl fill-[#1da1f2]" />,
  },
  {
    name: "apple",
    image: <AiFillApple className="text-2xl fill-[#a2aaad]" />,
  },
];

export const AuthDialog = () => {
  const { select, wallets } = useWallet();
  const { connected, login } = useWalletContext();
  const { isOpenAuthDialog, setIsOpenAuthDialog } = useWeb3AuthWallet();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isActiveLoading, setIsActiveLoading] = React.useState<string>("");

  React.useEffect(() => {
    if (connected) {
      setIsOpenAuthDialog(false);
      setIsLoading(false);
      setIsActiveLoading("");
    }
  }, [connected]);

  return (
    <div>
      <Dialog open={isOpenAuthDialog} onOpenChange={(open) => setIsOpenAuthDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <Mrgn width={40} />
            <DialogTitle>Sign in to marginfi</DialogTitle>
            <DialogDescription>
              Sign in with email or social and we&apos;ll create a marginfi wallet for you.
              <br className="hidden lg:block" /> Or, if you&apos;re experienced, connect your own wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="w-full md:w-4/5 mx-auto">
            <AuthDialogEmailForm
              loading={isLoading && isActiveLoading === "email"}
              active={!isLoading || (isLoading && isActiveLoading === "email")}
              onSubmit={(email) => {
                setIsLoading(true);
                setIsActiveLoading("email");
                login("email_passwordless", { login_hint: email });
              }}
            />

            <div className="my-4 flex items-center justify-center text-sm">
              <hr className="flex-grow border-gray-300 dark:border-gray-700" />
              <span className="px-2 text-gray-500 dark:text-gray-400">or sign in with</span>
              <hr className="flex-grow border-gray-300 dark:border-gray-700" />
            </div>

            <ul className="flex flex-col gap-2 w-full">
              {socialProviders.map((provider, i) => (
                <li className="flex flex-col" key={i}>
                  <AuthDialogButton
                    loading={isLoading && isActiveLoading === provider.name}
                    active={!isLoading || (isLoading && isActiveLoading === provider.name)}
                    name={provider.name}
                    image={provider.image}
                    onClick={() => {
                      setIsLoading(true);
                      setIsActiveLoading(provider.name);
                      login(provider.name);
                    }}
                  />
                </li>
              ))}
            </ul>

            {wallets.filter((wallet) => wallet.readyState === "Installed").length > 0 && (
              <>
                <div className="my-4 flex items-center justify-center text-sm">
                  <hr className="flex-grow border-gray-300 dark:border-gray-700" />
                  <span className="px-2 text-gray-500 dark:text-gray-400">or connect wallet</span>
                  <hr className="flex-grow border-gray-300 dark:border-gray-700" />
                </div>
                <ul className="flex flex-col gap-2">
                  {wallets
                    .filter((wallet) => wallet.readyState === "Installed")
                    .map((wallet, i) => (
                      <li className="flex flex-col" key={i}>
                        <AuthDialogButton
                          name={wallet.adapter.name}
                          image={<Image src={wallet.adapter.icon} width={20} height={20} alt={wallet.adapter.name} />}
                          loading={isLoading && isActiveLoading === wallet.adapter.name}
                          active={!isLoading || (isLoading && isActiveLoading === wallet.adapter.name)}
                          onClick={() => {
                            setIsLoading(true);
                            setIsActiveLoading(wallet.adapter.name);
                            select(wallet.adapter.name);
                            setIsOpenAuthDialog(false);
                          }}
                        />
                      </li>
                    ))}
                </ul>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
