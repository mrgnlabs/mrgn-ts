import React from "react";
import {
  Asset,
  AuthenticationStrategy,
  Environment,
  EventKind,
  MesoEvent,
  Network,
  SignedMessageResult,
  inlineTransfer,
} from "@meso-network/meso-js";

import { loadMoonPay } from "@moonpay/moonpay-js";

import { useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { IconArrowLeft, IconX } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { cn } from "~/utils";

export const WalletOnramp = () => {
  const divRef = React.useRef<HTMLDivElement>(null);
  const [amountRaw, setAmountRaw] = React.useState<string>("100.00");
  const [showMeso, setIsShowMeso] = React.useState<boolean>(false);

  const [moonPay, setMoonPay] = React.useState<any>(null);
  const { wallet } = useWalletContext();
  const [isOnrampActive, setIsOnrampActive] = useUiStore((state) => [
    state.isWalletOnrampActive,
    state.setIsOnrampActive,
  ]);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const error = React.useMemo(() => {
    if (amount > 0 && amount < 25) return "Please enter an amount above 25.";
  }, [amount]);

  const removeMeso = React.useCallback(() => {
    if (divRef.current && divRef.current.innerHTML) {
      divRef.current.innerHTML = "";
      setIsShowMeso(false);
    }
  }, [divRef, setIsShowMeso]);

  const initializeMeso = React.useCallback(() => {
    if (!divRef.current) return;
    const transfer = inlineTransfer({
      container: "#outlet",
      partnerId: "marginfi",
      environment: Environment.SANDBOX,
      sourceAmount: amount.toString() as any,
      sourceAsset: "USD",
      authenticationStrategy: AuthenticationStrategy.BYPASS_WALLET_VERIFICATION,
      destinationAsset: Asset.SOL,
      network: Network.SOLANA_MAINNET,
      walletAddress: wallet.publicKey.toBase58(),

      // A callback to handle events throughout the integration lifecycle
      onEvent({ kind, payload }: MesoEvent) {},

      // A callback to handle having the user verify their wallet ownership by signing a message
      async onSignMessageRequest(message: string) {
        return "";
      },
    });
    setIsShowMeso(true);
  }, [divRef, wallet, amount, setIsShowMeso]);

  const amountOptions = [
    {
      label: "$25",
      value: 25,
    },
    {
      label: "$50",
      value: 50,
    },
    {
      label: "$100",
      value: 100,
    },
  ];

  return (
    <div className="relative mt-5 p-2 space-y-2">
      {showMeso && (
        <div
          className="absolute z-20 top-3 left-4 opacity-70 text-sm cursor-pointer flex items-center gap-2"
          onClick={() => removeMeso()}
        >
          <IconArrowLeft width={18} height={18} /> enter amount
        </div>
      )}
      {!showMeso && (
        <div className="space-y-8">
          <div className="space-y-2 text-muted-foreground">
            <p>How much SOL would you like to purchase?</p>
            <div className="flex flex-col w-full gap-4">
              <ul className="grid grid-cols-3 gap-3 w-full">
                {amountOptions.map((option, idx) => (
                  <li key={idx}>
                    <Button
                      className={cn(
                        "gap-0.5 h-auto py-4 w-full border border-transparent bg-background transition-colors hover:bg-background-gray-hover",
                        amount === option.value && "bg-background-gray-hover border-chartreuse"
                      )}
                      variant="secondary"
                      onClick={() => {
                        setAmountRaw(numberFormater.format(option.value));
                      }}
                    >
                      {option.label}
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Custom amount</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmountRaw(e.target.value)}
                  placeholder="Custom amount"
                  className={cn(
                    "h-auto bg-background py-3 px-4 border-0 w-full text-white transition-colors focus-visible:ring-0",
                    !amountOptions.find((value) => value.value === amount) && "border-chartreuse"
                  )}
                />
              </div>
            </div>
          </div>
          {error && <div className="text-destructive-foreground text-sm">{error}</div>}
          <Button disabled={!!error || amount <= 0} onClick={() => initializeMeso()} className="w-full mt-8">
            Buy crypto
          </Button>
        </div>
      )}
      <div className={cn(showMeso ? "block" : "hidden", "relative")}>
        <div id="outlet" className="h-[350px]" ref={divRef}></div>
      </div>
    </div>
  );
};
