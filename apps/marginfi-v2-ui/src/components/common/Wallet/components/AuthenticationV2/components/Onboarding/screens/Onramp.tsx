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

import { OnrampScreenProps, cn } from "~/utils";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { IconArrowLeft } from "~/components/ui/icons";

interface props extends OnrampScreenProps {}

export const Onramp = ({ onNext }: props) => {
  const { wallet } = useWalletContext();
  const divRef = React.useRef<HTMLDivElement>(null);
  const [amountRaw, setAmountRaw] = React.useState<string>("100.00");
  const [isCustomMode, setIsCustomMode] = React.useState<boolean>(false);
  const [showMeso, setIsShowMeso] = React.useState<boolean>(false);

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
    if (divRef.current && !(divRef.current as any)?.innerHTML) {
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
        onEvent({ kind, payload }: MesoEvent) {
          if (kind === EventKind.TRANSFER_COMPLETE) {
            console.log("Transfer complete", payload);
          }
        },

        // A callback to handle having the user verify their wallet ownership by signing a message
        async onSignMessageRequest(message: string) {
          return "";
        },
      });
      setIsShowMeso(true);
    }
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
    // {
    //   label: "$75",
    //   value: 75,
    // },
    {
      label: "$100",
      value: 100,
    },
  ];

  return (
    <ScreenWrapper>
      <div className="p-2 space-y-2">
        {showMeso && (
          <div className="absolute left-4 opacity-70 text-sm cursor-pointer flex gap-2" onClick={() => removeMeso()}>
            <IconArrowLeft width={18} height={18} /> enter amount
          </div>
        )}
        {!showMeso && (
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-muted-foreground">Select how much USD to onramp</p>
              <div className="flex justify-between items-center w-full">
                <ul className="grid grid-cols-4 gap-2">
                  {amountOptions.map((option, idx) => (
                    <li key={idx}>
                      <Button
                        className={cn(
                          "gap-0.5 h-auto w-full font-light border border-transparent bg-background/50 transition-colors hover:bg-background-gray-hover",
                          amount === option.value && "bg-background-gray-hover border-chartreuse"
                        )}
                        variant="secondary"
                        onClick={() => {
                          setAmountRaw(numberFormater.format(option.value));
                          setIsCustomMode(false);
                        }}
                      >
                        {option.label}
                      </Button>
                    </li>
                  ))}
                </ul>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmountRaw(e.target.value)}
                  onFocus={() => setIsCustomMode(true)}
                  onBlur={() => setIsCustomMode(false)}
                  placeholder="Custom amount"
                  className={cn(
                    "h-aut max-w-[120px] bg-background/50 py-3 px-4 border border-muted-foreground text-white transition-colors focus-visible:ring-0",
                    !amountOptions.find((value) => value.value === amount) && "border-chartreuse"
                  )}
                />
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

      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};
