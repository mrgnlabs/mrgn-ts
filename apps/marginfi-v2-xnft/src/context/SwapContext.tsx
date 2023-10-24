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
import { OnTransaction, QuoteResponseMeta, SwapMode, SwapResult, useJupiter } from "@jup-ag/react-hook";
import { TokenInfo } from "@solana/spl-token-registry";
import { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { WRAPPED_SOL_MINT } from "@jup-ag/common";
import Decimal from "decimal.js";
import JSBI from "jsbi";

import { FormProps } from "~/types/jupiterTypes";
import { useConnection } from "~/context/ConnectionContext";
import { useWallet } from "~/context/WalletContext";
import { fromLamports, toLamports } from "~/utils";
import { DEFAULT_SLIPPAGE, PRIORITY_NONE } from "~/consts";
import { useJupiterStore } from "~/store/store";

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
  quoteReponseMeta: QuoteResponseMeta | null;
  setQuoteResponseMeta: Dispatch<SetStateAction<QuoteResponseMeta | null>>;
  onSubmit: () => Promise<SwapResult | null>;
  lastSwapResult: SwapResult | null;
  formProps: FormProps;
  swapping: {
    txStatus:
      | {
          txid: string;
          status: "loading" | "fail" | "success";
        }
      | undefined;
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
  quoteReponseMeta: null,
  setQuoteResponseMeta() {},
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
    txStatus: undefined,
  },
  reset() {},
  jupiter: {
    programIdsExcluded: new Set(),
    programIdToLabelMap: new Map(),
    setProgramIdsExcluded() {},
    quoteResponseMeta: undefined,
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
    slippage: DEFAULT_SLIPPAGE,
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

  const { publicKey: walletPublicKey, wallet } = useWallet();
  const { connection } = useConnection();

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
    fetchJupiterState({ connection, wallet: wallet ?? undefined });
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
    quoteResponseMeta,
    allTokenMints,
    routeMap,
    exchange,
    loading: loadingQuotes,
    refresh,
    lastRefreshTimestamp,
    error,
    programIdsExcluded,
    programIdToLabelMap,
    setProgramIdsExcluded,
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

  const [quoteReponseMeta, setQuoteResponseMeta] = useState<QuoteResponseMeta | null>(null);
  useEffect(() => {
    if (!quoteResponseMeta) {
      setQuoteResponseMeta(null);
      return;
    }
    // the UI sorts the best route depending on ExactIn or ExactOut
    setQuoteResponseMeta(quoteResponseMeta);
  }, [jupiterSwapMode, quoteResponseMeta]);

  useEffect(() => {
    setForm((prev) => {
      const newValue = { ...prev };

      let { inAmount, outAmount } = quoteReponseMeta?.quoteResponse || {};
      if (jupiterSwapMode === SwapMode.ExactIn) {
        newValue.toValue = outAmount ? String(fromLamports(outAmount, toTokenInfo?.decimals || 0)) : "";
      } else {
        newValue.fromValue = inAmount ? String(fromLamports(inAmount, fromTokenInfo?.decimals || 0)) : "";
      }
      return newValue;
    });
  }, [quoteReponseMeta, fromTokenInfo, toTokenInfo, jupiterSwapMode]);

  const [txStatus, setTxStatus] = useState<
    | {
        txid: string;
        status: "loading" | "fail" | "success";
      }
    | undefined
  >(undefined);

  const onTransaction: OnTransaction = async (txid, awaiter) => {
    const tx = txStatus?.txid === txid ? txStatus : undefined;
    if (!tx) {
      setTxStatus((prev) => ({ ...prev, txid, status: "loading" }));
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
      const tx = prev?.txid === txid ? prev : undefined;
      if (tx) {
        tx.status = success ? "success" : "fail";
      }
      return prev ? { ...prev } : undefined;
    });
  };

  const [lastSwapResult, setLastSwapResult] = useState<SwapResult | null>(null);
  const onSubmit = useCallback(async () => {
    console.log({ wallet, quoteReponseMeta, walletPublicKey });
    if (!walletPublicKey || !wallet || !quoteReponseMeta) {
      return null;
    }

    const signerWallet = {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
      name: "xNftSignerWallet",
    } as SignerWalletAdapter;

    try {
      // const test = await exchange({
      //   routeInfo: quoteReponseMeta,
      // });
      const swapResult = await exchange({
        wallet: signerWallet,
        routeInfo: quoteReponseMeta,
        onTransaction,
        computeUnitPriceMicroLamports,
      });

      setLastSwapResult(swapResult);
      setForm((prev) => ({ ...prev, fromValue: "", toValue: "" }));
      return swapResult;
    } catch (error) {
      console.log("Swap error", error);
      return null;
    }
  }, [walletPublicKey, quoteReponseMeta]);

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

        setQuoteResponseMeta(null);
        setErrors(initialSwapContext.errors);
        setLastSwapResult(initialSwapContext.lastSwapResult);
        setTxStatus(initialSwapContext.swapping.txStatus);
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
        quoteReponseMeta,
        setQuoteResponseMeta,
        onSubmit,
        lastSwapResult,
        reset,

        formProps,
        swapping: {
          txStatus,
        },
        jupiter: {
          quoteResponseMeta: JSBI.GT(amount, ZERO) ? quoteResponseMeta : undefined,
          programIdsExcluded,
          programIdToLabelMap,
          setProgramIdsExcluded,
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
