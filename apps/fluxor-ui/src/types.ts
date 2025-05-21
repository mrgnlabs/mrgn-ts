import { CSSProperties } from "react";
import { Root } from "react-dom/client";

import { AddressLookupTableAccount, ComputeBudgetInstruction, PublicKey, TransactionError } from "@solana/web3.js";
import { QuoteResponseMeta } from "@mrgnlabs/mrgn-utils";
import { SwapResult } from "@jup-ag/common";

import { createStore } from "zustand";
import { SwapMode } from "@jup-ag/api";
import { WalletContextStateOverride } from "~/components/wallet-v2";
import { WalletContextState } from "@solana/wallet-adapter-react";

// ----------------------------------------------------------------------------
// Jupiter types
// ----------------------------------------------------------------------------

/** The position of the widget */

export type WidgetPosition = "bottom-left" | "bottom-right" | "top-left" | "top-right";
/** The size of the widget */
export type WidgetSize = "sm" | "default";

export interface FormProps {
  /** Default to `ExactIn`. ExactOut can be used to get an exact output of a token (e.g. for Payments) */
  swapMode?: SwapMode;
  /** Initial amount to swap */
  initialAmount?: string;
  /** When true, user cannot change the amount (e.g. for Payments) */
  fixedAmount?: boolean;
  /** Initial input token to swap */
  initialInputMint?: string;
  /** When true, user cannot change the input token */
  fixedInputMint?: boolean;
  /** Initial output token to swap */
  initialOutputMint?: string;
  /** When true, user cannot change the output token (e.g. to buy your project's token) */
  fixedOutputMint?: boolean;
  /** Initial slippage to swap */
  initialSlippageBps?: number;
}

/** Built in support for these explorers */
export type DEFAULT_EXPLORER = "Solana Explorer" | "Solscan" | "Solana Beach" | "SolanaFM";

export interface TransactionInstruction {
  accounts: {
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }[];
  data: string;
  programId: string;
}

export interface IOnRequestIxCallback {
  meta: {
    sourceAddress: PublicKey;
    destinationAddress: PublicKey;
    quoteResponseMeta: QuoteResponseMeta;
  };
  instructions: {
    tokenLedgerInstruction: TransactionInstruction;
    computeBudgetInstructions: ComputeBudgetInstruction;
    setupInstructions: TransactionInstruction[];
    swapInstruction: TransactionInstruction;
    cleanupInstruction: TransactionInstruction;
    addressLookupTableAddresses: AddressLookupTableAccount;
    error: string;
  };
  onSubmitWithIx: (swapResult: SwapResult) => void;
}

export interface IInit {
  /** Solana RPC endpoint */
  endpoint: string;
  /** TODO: Update to use the new platform fee and accounts */
  platformFeeAndAccounts?: any;
  /** Configure Terminal's behaviour and allowed actions for your user */
  formProps?: FormProps;
  /** Only allow strict token by [Jupiter Token List API](https://station.jup.ag/docs/token-list/token-list-api) */
  strictTokenList?: boolean;
  /** Default explorer for your user */
  defaultExplorer?: DEFAULT_EXPLORER;
  /** Auto connect to wallet on subsequent visits */
  autoConnect?: boolean;
  /** Use user's slippage instead of initialSlippageBps, defaults to true */
  useUserSlippage?: boolean;
  /** TODO: NOT Supported yet, presets of slippages, defaults to [0.1, 0.5, 1.0] */
  slippagePresets?: number[];

  /** Display & Styling */

  /** Display mode */
  displayMode?: "modal" | "integrated" | "widget";
  /** When displayMode is 'integrated', this is the id of the element to render the integrated widget into */
  integratedTargetId?: string;
  /** When displayMode is 'widget', this is the behaviour and style of the widget */
  widgetStyle?: {
    position?: WidgetPosition;
    size?: WidgetSize;
  };
  /** In case additional styling is needed for Terminal container */
  containerStyles?: CSSProperties;
  /** In case additional styling is needed for Terminal container */
  containerClassName?: string;

  /** When true, wallet connection are handled by your dApp, and use `syncProps()` to syncronise wallet state with Terminal */
  enableWalletPassthrough?: boolean;
  /** Optional, if wallet state is ready, you can pass it in here, or just use `syncProps()` */
  passthroughWalletContextState?: WalletContextState | WalletContextStateOverride;
  /** When enableWalletPassthrough is true, this allows Terminal to callback your dApp's wallet connection flow */
  onRequestConnectWallet?: () => void | Promise<void>;

  /** Callbacks */
  /** When an error has occured during swap */
  onSwapError?: ({
    error,
    quoteResponseMeta,
  }: {
    error?: TransactionError;
    quoteResponseMeta: QuoteResponseMeta | null;
  }) => void;
  /** When a swap has been successful */
  onSuccess?: ({
    txid,
    swapResult,
    quoteResponseMeta,
  }: {
    txid: string;
    swapResult: SwapResult;
    quoteResponseMeta: QuoteResponseMeta | null;
  }) => void;
  /** Callback when there's changes to the form */
  onFormUpdate?: (form: any) => void;
  /** Callback when there's changes to the screen */
  onScreenUpdate?: (screen: any) => void;

  /** Ask jupiter to quote with a maximum number of accounts, essential for composing with Jupiter Swap instruction */
  maxAccounts?: number;
  /** Request Ix instead of direct swap */
  onRequestIxCallback?: (ixAndCb: IOnRequestIxCallback) => Promise<void>;

  /** Internal resolves */

  /** Internal use to resolve domain when loading script */
  scriptDomain?: string;
}

export interface JupiterTerminal {
  _instance: JSX.Element | null;
  init: (props: IInit) => void;
  resume: () => void;
  close: () => void;
  root: Root | null;

  /** Passthrough */
  enableWalletPassthrough: boolean;
  onRequestConnectWallet: IInit["onRequestConnectWallet"];
  store: ReturnType<typeof createStore>;
  syncProps: (props: { passthroughWalletContextState?: IInit["passthroughWalletContextState"] }) => void;

  /** Callbacks */
  onSwapError: IInit["onSwapError"];
  onSuccess: IInit["onSuccess"];
  onFormUpdate: IInit["onFormUpdate"];
  onScreenUpdate: IInit["onScreenUpdate"];

  /** Request Ix instead of direct swap */
  onRequestIxCallback: IInit["onRequestIxCallback"];
}

// ----------------------------------------------------------------------------
// Mayan types
// ----------------------------------------------------------------------------

export type MayanWidgetChainName =
  | "solana"
  | "ethereum"
  | "bsc"
  | "polygon"
  | "avalanche"
  | "arbitrum"
  | "optimism"
  | "base";

// visit the Figma link below to see the color palette
// https://www.figma.com/community/file/1236300242311853150/Mayan-Widget
export type MayanWidgetColors = {
  N000?: string;
  N100?: string;
  N300?: string;
  N500?: string;
  N600?: string;
  N700?: string;
  N900?: string;
  tLightBlue?: string;
  green?: string;
  lightGreen?: string;
  red?: string;
  lightRed?: string;
  lightYellow?: string;
  primary?: string;
  primaryGradient?: string;
  tWhiteLight?: string;
  tWhiteBold?: string;
  tBlack?: string;
  mainBox?: string;
  background?: string;
  darkPrimary?: string;
  alwaysWhite?: string;
  tableBg?: string;
  transparentBg?: string;
  transparentBgDark?: string;
  buttonBackground?: string;
  toastBgRed?: string;
  toastBgNatural?: string;
  toastBgGreen?: string;
};
export type MayanWidgetConfigType = {
  // Constants
  enableSolanaPassThrough?: boolean;
  appIdentity: {
    uri: string;
    icon: string; //should be relative
    name: string;
  }; //use for  Wallet Adapter
  setDefaultToken?: boolean;

  // Init override
  rpcs?: { [index in MayanWidgetChainName]?: string };
  solanaExtraRpcs?: string[];
  defaultGasDrop?: { [index in MayanWidgetChainName]?: number };

  // Deeplink
  sourceChains?: MayanWidgetChainName[];
  destinationChains?: MayanWidgetChainName[];
  tokens?: {
    from?: { [index in MayanWidgetChainName]?: string[] };
    to?: { [index in MayanWidgetChainName]?: string[] };
    featured?: { [index in MayanWidgetChainName]?: string[] };
  };
  solanaReferrerAddress?: string;
  evmReferrerAddress?: string;
  referrerBps?: number;

  // Theme
  isNarrow?: boolean;
  colors?: MayanWidgetColors;
};

export type MayanSwapInfo = {
  hash: string;
  fromChain: MayanWidgetChainName;
  toChain: MayanWidgetChainName;
  fromToken: string;
  toToken: string;
  fromAmount: number;
};

