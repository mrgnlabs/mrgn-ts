import React from "react";

import Link from "next/link";
import Image from "next/image";

import { useWalletContext } from "~/hooks/useWalletContext";
import { useConvertkit } from "~/hooks/useConvertkit";
import { signUpYbx } from "~/utils/mintUtils";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { IconAlertTriangle, IconCheck, IconLoader } from "~/components/ui/icons";

enum WalletNotisState {
  DEFAULT = "default",
  UPDATING = "updating",
  SUCCESS = "success",
}

export const WalletNotis = () => {
  const [email, setEmail] = React.useState(localStorage.getItem("mrgnYbxNotifications") || "");
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [walletNotisState, setWalletNotisState] = React.useState<WalletNotisState>(WalletNotisState.DEFAULT);

  const notificationFormDisabled = React.useMemo(() => {
    return walletNotisState === WalletNotisState.UPDATING || !email;
  }, [walletNotisState, email]);

  const onSubscribe = React.useCallback(async () => {
    if (!emailInputRef.current) return;
    setWalletNotisState(WalletNotisState.UPDATING);
    try {
      await signUpYbx(emailInputRef, "notifications");
      setWalletNotisState(WalletNotisState.SUCCESS);

      localStorage.setItem("mrgnYbxNotifications", emailInputRef.current?.value);
    } catch (error) {
      setWalletNotisState(WalletNotisState.DEFAULT);
      setErrorMsg("There was an error signing up for notifications. Please try again.");
    }
  }, [emailInputRef]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        onSubscribe();
      }}
    >
      <p className="flex flex-col gap-2 mb-6 pb-4 border-b border-background-gray-hover">
        <span className="text-sm font-medium">Set up Telegram notifications with</span>{" "}
        <Button
          variant="outline"
          className="px-2 pr-3.5 py-2.5 gap-1.5 max-w-max"
          onClick={(e) => {
            e.preventDefault();
            window.open("https://t.me/HeimdallWatchBot");
          }}
        >
          <Image src="/heimdall.jpg" alt="HeimdallWatchBot Logo" width={28} height={28} className="rounded-full" />{" "}
          HiemdallWatchBot
        </Button>
      </p>
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium">
          Sign up for YBX alerts
        </Label>
        <Input
          ref={emailInputRef}
          id="email"
          type="email"
          placeholder="example@example.com"
          value={email || ""}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg my-4">
          <IconAlertTriangle size={18} className="translate-y-0.5" />
          {errorMsg}
        </div>
      )}

      <Button disabled={notificationFormDisabled} type="submit">
        {walletNotisState === WalletNotisState.DEFAULT && "Update notifications"}
        {walletNotisState === WalletNotisState.UPDATING && (
          <>
            <IconLoader size={18} /> Updating...
          </>
        )}
        {walletNotisState === WalletNotisState.SUCCESS && (
          <>
            <IconCheck size={18} /> Updated!
          </>
        )}
      </Button>
    </form>
  );
};
