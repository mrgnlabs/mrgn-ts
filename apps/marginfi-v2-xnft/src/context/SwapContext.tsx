import React, {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ZERO } from "@jup-ag/math";
import {
  IConfirmationTxDescription,
  OnTransaction,
  RouteInfo,
  SwapMode,
  SwapResult,
  useJupiter,
} from "@jup-ag/react-hook";
import { TokenInfo } from "@solana/spl-token-registry";
import { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { WRAPPED_SOL_MINT } from "@jup-ag/common";
import Decimal from "decimal.js";
import JSBI from "jsbi";

import { FormProps } from "~/types/jupiterTypes";
import { useWallet } from "~/hooks/useWallet";
import { useConnection } from "~/hooks/useConnection";
import { fromLamports, toLamports } from "~/utils";
import { DEFAULT_SLIPPAGE, PRIORITY_NONE } from "~/consts";
import { useJupiterStore } from "~/store";

export interface IForm {
  fromMint: string;
  toMint: string;
  fromValue: string;
  toValue: string;
}

export interface ISwapContext {
  form: IForm;
  setForm: Dispatch<SetStateAction<IForm>>;
  errors: Record<string, { title: string; message: string }>;
  setErrors: Dispatch<
    SetStateAction<
      Record<
        string,
        {
          title: string;
          message: string;
        }
      >
    >
  >;
  fromTokenInfo?: TokenInfo | null;
  toTokenInfo?: TokenInfo | null;
  selectedSwapRoute: RouteInfo | null;
  setSelectedSwapRoute: Dispatch<SetStateAction<RouteInfo | null>>;
  onSubmit: () => Promise<SwapResult | null>;
  lastSwapResult: SwapResult | null;
  formProps: FormProps;
  swapping: {
    totalTxs: number;
    txStatus: Array<{
      txid: string;
      txDescription: IConfirmationTxDescription;
      status: "loading" | "fail" | "success";
    }>;
  };
  reset: (props?: { resetValues: boolean }) => void;
  jupiter: Omit<ReturnType<typeof useJupiter>, "exchange"> & {
    exchange: ReturnType<typeof useJupiter>["exchange"] | undefined;
    asLegacyTransaction: boolean;
    setAsLegacyTransaction: Dispatch<SetStateAction<boolean>>;
    priorityFeeInSOL: number;
    setPriorityFeeInSOL: Dispatch<SetStateAction<number>>;
    slippage: number;
    setSlippage: Dispatch<SetStateAction<number>>;
  };
}

export const initialSwapContext: ISwapContext = {
  form: {
    fromMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    toMint: WRAPPED_SOL_MINT.toString(),
    fromValue: "",
    toValue: "",
  },
  setForm() {},
  errors: {},
  setErrors() {},
  fromTokenInfo: undefined,
  toTokenInfo: undefined,
  selectedSwapRoute: null,
  setSelectedSwapRoute() {},
  onSubmit: async () => null,
  lastSwapResult: null,
  formProps: {
    swapMode: SwapMode.ExactIn,
    initialAmount: undefined,
    fixedAmount: undefined,
    initialInputMint: undefined,
    fixedInputMint: undefined,
    initialOutputMint: undefined,
    fixedOutputMint: undefined,
  },
  swapping: {
    totalTxs: 0,
    txStatus: [],
  },
  reset() {},
  jupiter: {
    routes: [],
    allTokenMints: [],
    routeMap: new Map(),
    exchange: undefined,
    loading: false,
    refresh() {},
    lastRefreshTimestamp: 0,
    error: undefined,
    asLegacyTransaction: false,
    setAsLegacyTransaction() {},
    priorityFeeInSOL: 0,
    setPriorityFeeInSOL() {},
    slippage: 0.5,
    setSlippage() {},
  },
};

export const SwapContext = createContext<ISwapContext>(initialSwapContext);

export function useSwapContext(): ISwapContext {
  return useContext(SwapContext);
}

export const SwapContextProvider: FC<{
  asLegacyTransaction: boolean;
  setAsLegacyTransaction: React.Dispatch<React.SetStateAction<boolean>>;
  formProps?: FormProps;
  children: ReactNode;
}> = (props) => {
  const { asLegacyTransaction, setAsLegacyTransaction, formProps: originalFormProps, children } = props;

  const [tokenMap, fetchJupiterState] = useJupiterStore((state) => [state.tokenMap, state.fetchJupiterState]);

  const { publicKey, wallet } = useWallet();
  const connection = useConnection();

  const formProps: FormProps = useMemo(
    () => ({ ...initialSwapContext.formProps, ...originalFormProps }),
    [originalFormProps]
  );

  const [form, setForm] = useState<IForm>({
    fromMint: formProps?.initialInputMint ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    toMint: formProps?.initialOutputMint ?? WRAPPED_SOL_MINT.toString(),
    fromValue: "",
    toValue: "",
  });
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [errors, setErrors] = useState<Record<string, { title: string; message: string }>>({});
  const jupiterSwapMode = useMemo(
    () => (formProps?.swapMode ? SwapMode[formProps?.swapMode] : SwapMode.ExactIn),
    [formProps?.swapMode]
  );

  const fromTokenInfo = useMemo(() => {
    const tokenInfo = form.fromMint ? tokenMap.get(form.fromMint) : null;
    return tokenInfo;
  }, [form.fromMint, tokenMap]);

  const toTokenInfo = useMemo(() => {
    const tokenInfo = form.toMint ? tokenMap.get(form.toMint) : null;
    return tokenInfo;
  }, [form.toMint, tokenMap]);

  // Set value given initial amount
  const setupInitialAmount = useCallback(() => {
    if (!formProps?.initialAmount || tokenMap.size === 0 || !fromTokenInfo || !toTokenInfo) return;

    const toUiAmount = (mint: string) => {
      const tokenInfo = mint ? tokenMap.get(mint) : undefined;
      if (!tokenInfo) return;
      return String(fromLamports(JSBI.BigInt(formProps.initialAmount ?? 0), tokenInfo.decimals));
    };

    if (jupiterSwapMode === SwapMode.ExactOut) {
      setForm((prev) => {
        return { ...prev, toValue: toUiAmount(prev.toMint) ?? "" };
      });
    } else {
      setForm((prev) => ({
        ...prev,
        fromValue: toUiAmount(prev.fromMint) ?? "",
      }));
    }
  }, [formProps?.initialAmount, jupiterSwapMode, tokenMap]);

  useEffect(() => {
    fetchJupiterState({ connection, wallet });
  }, [connection, wallet]);

  useEffect(() => {
    setupInitialAmount();
  }, [formProps?.initialAmount, jupiterSwapMode, tokenMap]);

  const nativeAmount = useMemo(() => {
    if (jupiterSwapMode === SwapMode.ExactOut) {
      if (!form.toValue || !toTokenInfo) return JSBI.BigInt(0);
      return toLamports(Number(form.toValue), Number(toTokenInfo.decimals));
    } else {
      if (!form.fromValue || !fromTokenInfo) return JSBI.BigInt(0);
      return toLamports(Number(form.fromValue), Number(fromTokenInfo.decimals));
    }
  }, [form.fromValue, form.fromMint, fromTokenInfo, form.toValue, form.toMint, toTokenInfo, jupiterSwapMode]);

  const amount = JSBI.BigInt(nativeAmount);
  const {
    routes: swapRoutes,
    allTokenMints,
    routeMap,
    exchange,
    loading: loadingQuotes,
    refresh,
    lastRefreshTimestamp,
    error,
  } = useJupiter({
    amount,
    inputMint: useMemo(() => (form.fromMint ? new PublicKey(form.fromMint) : PublicKey.default), [form.fromMint]),
    outputMint: useMemo(() => (form.toMint ? new PublicKey(form.toMint) : PublicKey.default), [form.toMint]),
    swapMode: jupiterSwapMode,
    slippageBps: Math.ceil(slippage * 100),
    asLegacyTransaction,
  });
  // Refresh on slippage change
  useEffect(() => refresh(), [slippage]);

  const [selectedSwapRoute, setSelectedSwapRoute] = useState<RouteInfo | null>(null);
  useEffect(() => {
    if (!swapRoutes || swapRoutes.length === 0) {
      setSelectedSwapRoute(null);
      return;
    }
    // the UI sorts the best route depending on ExactIn or ExactOut
    setSelectedSwapRoute(swapRoutes[0]);
  }, [jupiterSwapMode, swapRoutes]);

  useEffect(() => {
    setForm((prev) => {
      const newValue = { ...prev };

      if (jupiterSwapMode === SwapMode.ExactIn) {
        newValue.toValue = selectedSwapRoute?.outAmount
          ? String(fromLamports(selectedSwapRoute?.outAmount, toTokenInfo?.decimals || 0))
          : "";
      } else {
        newValue.fromValue = selectedSwapRoute?.inAmount
          ? String(fromLamports(selectedSwapRoute?.inAmount, fromTokenInfo?.decimals || 0))
          : "";
      }
      return newValue;
    });
  }, [selectedSwapRoute, fromTokenInfo, toTokenInfo, jupiterSwapMode]);

  const [totalTxs, setTotalTxs] = useState(0);
  const [txStatus, setTxStatus] = useState<
    Array<{
      txid: string;
      txDescription: IConfirmationTxDescription;
      status: "loading" | "fail" | "success";
    }>
  >([]);

  const onTransaction: OnTransaction = async (
    txid: string,
    totalTxs: React.SetStateAction<number>,
    txDescription: any,
    awaiter: any
  ) => {
    setTotalTxs(totalTxs);

    const tx = txStatus.find((tx) => tx.txid === txid);
    if (!tx) {
      setTxStatus((prev) => [...prev, { txid, txDescription, status: "loading" }]);
    }

    let success: boolean = false;

    if ((await awaiter) instanceof Error) {
      if (connection) {
        try {
          const latestBlockHash = await connection.getLatestBlockhash();
          const secondConfirm = await connection.confirmTransaction(
            {
              signature: txid,
              blockhash: latestBlockHash.blockhash,
              lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            },
            "confirmed"
          );
          if (secondConfirm.value.err) {
            throw new Error();
          }

          success = true;
        } catch {
          success = false;
        }
      }
    } else {
      success = true;
    }

    setTxStatus((prev) => {
      const tx = prev.find((tx) => tx.txid === txid);
      if (tx) {
        tx.status = success ? "success" : "fail";
      }
      return [...prev];
    });
  };

  const [lastSwapResult, setLastSwapResult] = useState<SwapResult | null>(null);
  const onSubmit = useCallback(async () => {
    if (!publicKey || !wallet || !selectedSwapRoute) {
      return null;
    }

    try {
      const swapResult = await exchange({
        wallet: wallet as any as SignerWalletAdapter,
        routeInfo: selectedSwapRoute,
        onTransaction,
        // computeUnitPriceMicroLamports,
      });

      setLastSwapResult(swapResult);
      return swapResult;
    } catch (error) {
      console.log("Swap error", error);
      return null;
    }
  }, [publicKey, selectedSwapRoute]);

  const refreshAll = () => {
    refresh();
    // refreshAccount();
  };

  const reset = useCallback(
    ({ resetValues } = { resetValues: true }) => {
      setTimeout(() => {
        if (resetValues) {
          setForm({ ...initialSwapContext.form, ...formProps });
          setupInitialAmount();
        }

        setSelectedSwapRoute(null);
        setErrors(initialSwapContext.errors);
        setLastSwapResult(initialSwapContext.lastSwapResult);
        setTxStatus(initialSwapContext.swapping.txStatus);
        setTotalTxs(initialSwapContext.swapping.totalTxs);
        // refreshAccount();
      }, 0);
    },
    [setupInitialAmount]
  );

  const [priorityFeeInSOL, setPriorityFeeInSOL] = useState<number>(PRIORITY_NONE);
  const computeUnitPriceMicroLamports = useMemo(() => {
    if (priorityFeeInSOL === undefined) return 0;
    return new Decimal(priorityFeeInSOL)
      .mul(10 ** 9) // sol into lamports
      .mul(10 ** 6) // lamports into microlamports
      .div(1_400_000) // divide by CU
      .round()
      .toNumber();
  }, [priorityFeeInSOL]);

  return (
    <SwapContext.Provider
      value={{
        form,
        setForm,
        errors,
        setErrors,
        fromTokenInfo,
        toTokenInfo,
        selectedSwapRoute,
        setSelectedSwapRoute,
        onSubmit,
        lastSwapResult,
        reset,

        formProps,
        swapping: {
          totalTxs,
          txStatus,
        },
        jupiter: {
          routes: JSBI.GT(amount, ZERO) ? swapRoutes : undefined,
          allTokenMints,
          routeMap,
          exchange,
          loading: loadingQuotes,
          refresh: refreshAll,
          lastRefreshTimestamp,
          error,
          asLegacyTransaction,
          setAsLegacyTransaction,
          priorityFeeInSOL,
          setPriorityFeeInSOL,
          slippage,
          setSlippage,
        },
      }}
    >
      {children}
    </SwapContext.Provider>
  );
};
