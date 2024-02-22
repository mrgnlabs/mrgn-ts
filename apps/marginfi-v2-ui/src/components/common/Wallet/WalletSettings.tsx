import React from "react";

import Link from "next/link";

import { PublicKey } from "@solana/web3.js";

import { cn } from "~/utils";
import { useConvertkit } from "~/hooks/useConvertkit";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { WalletTokens, Token, WalletOnramp } from "~/components/common/Wallet";
import { Label } from "~/components/ui/label";
import { IconCheck, IconInfoCircle, IconLoader, IconAlertTriangle } from "~/components/ui/icons";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

type WalletSettingsProps = {
  walletAddress: PublicKey;
  tokens: Token[];
};

enum WalletSettingsState {
  DEFAULT = "default",
  UPDATING = "updating",
  SUCCESS = "success",
}

export const WalletSettings = ({ walletAddress, tokens }: WalletSettingsProps) => {
  const { addSubscriber } = useConvertkit();
  const [walletSettingsState, setWalletSettingsState] = React.useState<WalletSettingsState>(
    WalletSettingsState.DEFAULT
  );
  const [email, setEmail] = React.useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = React.useState({
    health: false,
    ybx: false,
  });
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const notificationFormDisabled = React.useMemo(() => {
    return walletSettingsState === WalletSettingsState.UPDATING || !email;
  }, [walletSettingsState, email, notificationSettings]);

  const updateNotificationSettings = React.useCallback(async () => {
    if (!email) {
      return;
    }

    setWalletSettingsState(WalletSettingsState.UPDATING);

    if (notificationSettings.ybx) {
      const res = await addSubscriber(process.env.NEXT_PUBLIC_CONVERT_KIT_YBX_NOTIFICATIONS_FORM_UID!, email);

      if (res.error) {
        setErrorMsg(res.error);
        setWalletSettingsState(WalletSettingsState.DEFAULT);
        return;
      }
    }

    const apiUrl = window.location.origin + "/api/user/notifications";

    // create url with query params for notification settings
    const url = new URL(apiUrl);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress: walletAddress.toBase58(),
        email,
        accountHealth: notificationSettings.health,
        ybxUpdates: notificationSettings.ybx,
      }),
    });

    if (!res.ok) {
      setErrorMsg("There was an error updating notifications. Please try again.");
      setWalletSettingsState(WalletSettingsState.DEFAULT);
      return;
    }

    setErrorMsg(null);
    setWalletSettingsState(WalletSettingsState.SUCCESS);

    setTimeout(() => {
      setWalletSettingsState(WalletSettingsState.DEFAULT);
    }, 2000);
  }, [email, notificationSettings]);

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
      // document not found which means notifications have not been set
      const { success } = await res.json();
      if (success) {
        return;
      }

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
    fetchUsersNotificationSettings();
  }, [walletAddress]);

  return (
    <Accordion type="single" collapsible className="w-full space-y-4 mb-6">
      <AccordionItem value="assets">
        <AccordionTrigger className="bg-muted font-normal px-4 rounded-lg transition-colors hover:bg-background-gray-hover data-[state=open]:rounded-b-none data-[state=open]:bg-background-gray">
          Assets
        </AccordionTrigger>
        <AccordionContent className="bg-background-gray p-4 pt-0 rounded-b-lg">
          <WalletTokens tokens={tokens} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="notifications">
        <AccordionTrigger
          className={cn(
            "bg-muted font-normal px-4 rounded-lg transition-colors",
            "hover:bg-background-gray-hover data-[state=open]:rounded-b-none",
            "data-[state=open]:bg-background-gray"
          )}
        >
          <div className="flex gap-2 items-baseline">Notifications</div>
        </AccordionTrigger>
        <AccordionContent className="bg-background-gray p-4 pt-0 rounded-b-lg">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateNotificationSettings();
            }}
          >
            <p className="text-muted-foreground mb-6 pb-4 border-b border-background-gray-hover">
              Set up Telegram notifications with{" "}
              <Link href="#" className="border-b border-muted-foreground">
                HiemdallWatchBot
              </Link>
              .
            </p>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-muted-foreground">
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
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, ybx: checked as boolean })
                  }
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
              {walletSettingsState === WalletSettingsState.DEFAULT && "Update notifications"}
              {walletSettingsState === WalletSettingsState.UPDATING && (
                <>
                  <IconLoader size={18} /> Updating...
                </>
              )}
              {walletSettingsState === WalletSettingsState.SUCCESS && (
                <>
                  <IconCheck size={18} /> Updated!
                </>
              )}
            </Button>
          </form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
