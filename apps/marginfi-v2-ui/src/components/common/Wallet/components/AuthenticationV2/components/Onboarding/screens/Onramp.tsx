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

interface props extends OnrampScreenProps {}

export const Onramp = ({ onNext }: props) => {
  const divRef = React.useRef(null);

  React.useEffect(() => {
    if (divRef.current) launchMeso;
  }, []);

  const launchMeso = React.useCallback(() => {
    const transfer = inlineTransfer({
      container: "#outlet", // A valid CSS selector for an element on your page

      partnerId: "marginfi", // Your unique Meso partner ID
      environment: Environment.SANDBOX, // SANDBOX | PRODUCTION
      sourceAmount: "100", // The amount (in USD) the user will spend
      destinationAsset: Asset.SOL, // The asset the user will receive in the transfer. For on-ramping, this will be a token such as `ETH` or `SOL`.
      network: Network.SOLANA_MAINNET, // The network to use for the transfer
      walletAddress: "D16QZnFLFgCtVwWsBH4FNXFXhYuW4QQ7qYu5brqmtXy2", // The user's wallet address obtained at runtime by your application

      sourceAsset: "USD",
      authenticationStrategy: AuthenticationStrategy.BYPASS_WALLET_VERIFICATION,

      // A callback to handle events throughout the integration lifecycle
      onEvent({ kind, payload }: MesoEvent) {
        switch (kind) {
          // The iframe/window is ready
          case EventKind.READY:
            break;

          // The transfer has been approved and will go through, however funds have not yet moved.
          case EventKind.TRANSFER_APPROVED:
          // The transfer has been finalized and the assets have been transferred.
          case EventKind.TRANSFER_COMPLETE:
            console.log(payload.transfer);
            break;

          // There was an issue with the provided configuration
          case EventKind.CONFIGURATION_ERROR:
            console.error(payload.error.message);
            break;

          // The `network` provided in the configuration is not supported
          case EventKind.UNSUPPORTED_NETWORK_ERROR:
            console.error(payload.error.message);
            break;

          // The `destinationAsset` provided in the configuration is not supported
          case EventKind.UNSUPPORTED_ASSET_ERROR:
            console.error(payload.error.message);
            break;

          // A general error has occurred
          case EventKind.ERROR:
            console.error(payload.error.message);
            break;

          case EventKind.CLOSE:
            console.log("Meso experience closed.");
        }
      },

      // A callback to handle having the user verify their wallet ownership by signing a message
      onSignMessageRequest: function (message: string): Promise<SignedMessageResult> {
        throw new Error("Function not implemented.");
      },
    });
  }, []);

  return (
    <ScreenWrapper>
      <div className="mx-auto">Mesa onramp coming soon!</div>
      <div id="outlet"></div>
      <button id="buyCrypto">Buy Crypto</button>
      <WalletSeperator description="skip for now" onClick={() => onNext()} />
    </ScreenWrapper>
  );
};
