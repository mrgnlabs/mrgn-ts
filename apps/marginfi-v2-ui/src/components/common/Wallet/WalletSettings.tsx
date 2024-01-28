import React from "react";

import { cn } from "~/utils";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { WalletTokens } from "~/components/common/Wallet/WalletTokens";
import { Label } from "~/components/ui/label";
import { IconCheck, IconInfoCircle, IconLoader, IconAlertTriangle } from "~/components/ui/icons";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

enum WalletSettingsState {
  DEFAULT = "default",
  UPDATING = "updating",
  SUCCESS = "success",
}

export const WalletSettings = ({ tokens }: { tokens: any[] }) => {
  const [walletSettingsState, setWalletSettingsState] = React.useState<WalletSettingsState>(
    WalletSettingsState.DEFAULT
  );
  const [notificationSettings, setNotificationSettings] = React.useState({
    health: false,
    ybx: false,
    updates: false,
  });
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const updateNotificationSettings = React.useCallback(async () => {
    if (
      !emailInputRef.current ||
      !emailInputRef.current.value ||
      (!notificationSettings.health && !notificationSettings.updates && !notificationSettings.ybx)
    ) {
      return;
    }

    setWalletSettingsState(WalletSettingsState.UPDATING);

    setTimeout(() => {
      setWalletSettingsState(WalletSettingsState.SUCCESS);

      setTimeout(() => {
        setWalletSettingsState(WalletSettingsState.DEFAULT);
      }, 2000);
    }, 2000);
  }, [emailInputRef, notificationSettings]);

  return (
    <Accordion type="single" collapsible className="w-full mt-8 space-y-4">
      <AccordionItem value="assets">
        <AccordionTrigger className="bg-background-gray px-4 rounded-lg transition-colors hover:bg-background-gray-hover data-[state=open]:rounded-b-none data-[state=open]:bg-background-gray">
          Assets
        </AccordionTrigger>
        <AccordionContent className="bg-background-gray p-4 pt-0 rounded-b-lg">
          <WalletTokens tokens={tokens} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="notifications">
        <AccordionTrigger className="bg-background-gray px-4 rounded-lg transition-colors hover:bg-background-gray-hover data-[state=open]:rounded-b-none data-[state=open]:bg-background-gray">
          Notifications
        </AccordionTrigger>
        <AccordionContent className="bg-background-gray p-4 pt-0 rounded-b-lg">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateNotificationSettings();
            }}
          >
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
              <Input ref={emailInputRef} id="email" type="email" placeholder="example@example.com" />
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
              <li className="flex items-center gap-1.5">
                <Checkbox
                  checked={notificationSettings.updates}
                  id="updates"
                  className={cn(
                    "border-primary",
                    !notificationSettings.updates && "border-muted-foreground transition-colors hover:border-primary"
                  )}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, updates: checked as boolean })
                  }
                />{" "}
                <Label
                  htmlFor="updates"
                  className={cn(
                    "text-primary",
                    !notificationSettings.updates && "text-muted-foreground transition-colors hover:text-primary"
                  )}
                >
                  Future updates &amp; announcements
                </Label>
              </li>
            </ul>

            {errorMsg && (
              <div className="flex items-start gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg my-4">
                <IconAlertTriangle size={18} className="translate-y-0.5" />
                {errorMsg}
              </div>
            )}

            <Button
              disabled={
                walletSettingsState === WalletSettingsState.UPDATING ||
                !emailInputRef.current ||
                !emailInputRef.current.value ||
                (!notificationSettings.health && !notificationSettings.updates && !notificationSettings.ybx)
              }
              type="submit"
            >
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
