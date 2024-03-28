import React from "react";

import Link from "next/link";
import Image from "next/image";

import { useWalletContext } from "~/hooks/useWalletContext";
import { useConvertkit } from "~/hooks/useConvertkit";
import { cn } from "~/utils";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconLoader } from "~/components/ui/icons";

enum WalletNotisState {
  DEFAULT = "default",
  UPDATING = "updating",
  SUCCESS = "success",
}

export const WalletNotis = () => {
  const { walletAddress } = useWalletContext();
  const { addSubscriber } = useConvertkit();
  const [email, setEmail] = React.useState("");
  const [notificationSettings, setNotificationSettings] = React.useState({
    health: true,
    ybx: true,
  });
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [walletNotisState, setWalletNotisState] = React.useState<WalletNotisState>(WalletNotisState.DEFAULT);

  const notificationFormDisabled = React.useMemo(() => {
    return walletNotisState === WalletNotisState.UPDATING || !email;
  }, [walletNotisState, email]);

  const updateNotificationSettings = React.useCallback(async () => {
    if (!email) {
      return;
    }

    setWalletNotisState(WalletNotisState.UPDATING);

    if (notificationSettings.ybx) {
      const res = await addSubscriber(process.env.NEXT_PUBLIC_CONVERT_KIT_YBX_NOTIFICATIONS_FORM_UID!, email);

      if (res.error) {
        setErrorMsg(res.error);
        setWalletNotisState(WalletNotisState.DEFAULT);
        return;
      }
    }

    const apiUrl = window.location.origin + "/api/user/notifications";

    // create url with query params for notification settings
    const url = new URL(apiUrl);
    url.searchParams.append("walletAddress", walletAddress.toBase58());
    url.searchParams.append("email", email);
    url.searchParams.append("accountHealth", notificationSettings.health ? "true" : "false");
    url.searchParams.append("productUpdates", notificationSettings.ybx ? "true" : "false");

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress: walletAddress.toBase58(),
        email,
        accountHealth: notificationSettings.health,
        productUpdates: notificationSettings.ybx,
      }),
    });

    if (!res.ok) {
      setErrorMsg("There was an error updating notifications. Please try again.");
      setWalletNotisState(WalletNotisState.DEFAULT);
      return;
    }

    setErrorMsg(null);
    setWalletNotisState(WalletNotisState.SUCCESS);

    setTimeout(() => {
      setWalletNotisState(WalletNotisState.DEFAULT);
    }, 2000);
  }, [email, notificationSettings, walletAddress, addSubscriber]);

  const fetchUsersNotificationSettings = React.useCallback(async () => {
    const apiUrl = window.location.origin + "/api/user/notifications";
    const url = new URL(apiUrl);
    url.searchParams.append("walletAddress", walletAddress.toBase58());

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      setErrorMsg("There was an error fetching your notification settings. Please try again.");
      return;
    }

    const { data } = await res.json();

    setEmail(data.email);
    setNotificationSettings({
      health: data.account_health,
      ybx: data.product_updates,
    });
  }, [walletAddress]);

  React.useEffect(() => {
    // fetchUsersNotificationSettings();
  }, [walletAddress]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        updateNotificationSettings();
      }}
    >
      <p className="flex flex-col gap-2 mb-6 pb-4 border-b border-background-gray-hover text-base font-normal">
        Set up Telegram notifications with{" "}
        <Link href="#" className="flex items-center gap-1 group">
          <Image src="/heimdall.jpg" alt="HeimdallWatchBot Logo" width={28} height={28} className="rounded-full" />{" "}
          HiemdallWatchBot
        </Link>
      </p>
      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1.5">
                <IconInfoCircle size={16} /> Configure email notifications
              </TooltipTrigger>
              <TooltipContent>Click to copy</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="example@example.com"
          value={email || ""}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </div>

      <ul className="space-y-3">
        <li className="flex items-center gap-1.5">
          <Checkbox
            checked={notificationSettings.health}
            id="health"
            className={cn(
              !notificationSettings.health && "border-muted-foreground transition-colors hover:border-primary"
            )}
            onCheckedChange={(checked) =>
              setNotificationSettings({ ...notificationSettings, health: checked as boolean })
            }
          />{" "}
          <Label
            htmlFor="health"
            className={cn(
              "text-primary",
              !notificationSettings.health && "text-muted-foreground transition-colors hover:text-primary"
            )}
          >
            Account heath / liquidation risk
          </Label>
        </li>
        <li className="flex items-center gap-1.5">
          <Checkbox
            checked={notificationSettings.ybx}
            id="ybx"
            className={cn(
              !notificationSettings.ybx && "border-muted-foreground transition-colors hover:border-primary"
            )}
            onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, ybx: checked as boolean })}
          />{" "}
          <Label
            htmlFor="ybx"
            className={cn(
              "text-primary",
              !notificationSettings.ybx && "text-muted-foreground transition-colors hover:text-primary"
            )}
          >
            YBX launch notifications
          </Label>
        </li>
      </ul>

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
