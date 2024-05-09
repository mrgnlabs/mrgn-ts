import { DialogContent } from "~/components/ui/dialog";
import { AuthScreenProps, socialProviders } from "../../authDialogUitls";
import { cn } from "~/utils";
import { OnboardHeader, WalletAuthButton, WalletAuthEmailForm } from "../sharedComponents";
import { Button } from "~/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import React from "react";
import { WalletSeperator } from "../sharedComponents/WalletSeperator";
import { ethers } from "ethers";

interface props extends AuthScreenProps {}

async function connectMetaMask() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      console.log("MetaMask is connected");
    } catch (error) {
      console.error(error);
    }
  } else {
    alert("MetaMask is not installed!");
  }
}

export const OnboardingEth = ({
  isLoading,
  isActiveLoading,
  setIsLoading,
  setIsActiveLoading,
  loginWeb3Auth,
}: props) => {
  return (
    <DialogContent className={cn("md:block overflow-hidden p-4 pt-8 md:pt-4 justify-start md:max-w-xl")}>
      <OnboardHeader title={"Welcome to marginfi"} description={"Sign in to lend & earn interest in marginfi."} />

      <div className="w-full space-y-6 mt-8">
        <div
          className={cn(
            "relative bg-muted text-muted-foreground transition-all duration-300 w-full p-6 pt-5 rounded-lg overflow-hidden max-h-none"
          )}
        >
          <header className="cursor-pointer">
            <h2 className="font-semibold text-2xl text-white">For Ethereum users</h2>
            <p className="mt-2 text-sm sm:text-base">
              Sign in with email or socials and bridge your funds to marginfi. Or connect your wallet below.
            </p>
          </header>
          <Button onClick={() => connectMetaMask()}>WHHOW</Button>
          <div className="mt-4">
            <WalletAuthEmailForm
              loading={isLoading && isActiveLoading === "email"}
              active={!isLoading || (isLoading && isActiveLoading === "email")}
              onSubmit={(email) => {
                setIsLoading(true);
                setIsActiveLoading("email");
                loginWeb3Auth("email_passwordless", { login_hint: email });
              }}
            />
            <WalletSeperator description="or sign in with<" />
            <ul className="flex items-center justify-center gap-4 w-full mt-6 mb-2">
              {socialProviders.map((provider, i) => (
                <li key={i}>
                  <WalletAuthButton
                    loading={isLoading && isActiveLoading === provider.name}
                    active={!isLoading || (isLoading && isActiveLoading === provider.name)}
                    name={provider.name}
                    image={provider.image}
                    onClick={() => {
                      setIsLoading(true);
                      setIsActiveLoading(provider.name);
                      loginWeb3Auth(provider.name);
                    }}
                  />
                </li>
              ))}
            </ul>{" "}
          </div>
        </div>
      </div>
    </DialogContent>
  );
};
