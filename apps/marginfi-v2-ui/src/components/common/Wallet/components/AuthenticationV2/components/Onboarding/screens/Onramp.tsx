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

import { OnrampScreenProps } from "~/utils";

import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";
import { useWalletContext } from "~/hooks/useWalletContext";

interface props extends OnrampScreenProps {}

export const Onramp = ({ onNext }: props) => {
  const { wallet } = useWalletContext();
  const divRef = React.useRef(null);

  React.useEffect(() => {
    if (divRef.current && !(divRef.current as any)?.innerHTML) {
      console.log({ divRef });
      launchMeso();
    }
  }, [divRef]);

  const launchMeso = React.useCallback(() => {
    const transfer = inlineTransfer({
      container: "#outlet",
      partnerId: "marginfi",
      environment: Environment.SANDBOX,
      sourceAmount: "100",
      sourceAsset: "USD",
      authenticationStrategy: AuthenticationStrategy.BYPASS_WALLET_VERIFICATION,
      destinationAsset: Asset.SOL,
      network: Network.SOLANA_MAINNET,
      walletAddress: wallet.publicKey.toBase58(),

      // A callback to handle events throughout the integration lifecycle
      onEvent({ kind, payload }: MesoEvent) {
        console.log(kind, payload);
      },

      // A callback to handle having the user verify their wallet ownership by signing a message
      async onSignMessageRequest(message: string) {
        return "";
      },
    });
  }, [wallet]);

  return (
    <ScreenWrapper>
      <div id="outlet" ref={divRef} className="h-[350px]"></div>
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};
