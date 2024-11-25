import {
  BroadcastMethodType,
  DEFAULT_PROCESS_TX_STRATEGY,
  ProcessTransactionStrategy,
} from "@mrgnlabs/marginfi-client-v2";

export function getTransactionStrategy(): ProcessTransactionStrategy | undefined {
  const hasStrategyDefined =
    !!process.env.NEXT_PUBLIC_TX_FALLBACK_SEQUENCE ||
    !!process.env.NEXT_PUBLIC_TX_SINGLE_BROADCAST_TYPE ||
    !!process.env.NEXT_PUBLIC_TX_MULTI_BROADCAST_TYPE;

  const test = hasStrategyDefined
    ? {
        splitExecutionsStrategy: {
          singleTx: (process.env.NEXT_PUBLIC_TX_SINGLE_BROADCAST_TYPE ??
            DEFAULT_PROCESS_TX_STRATEGY.splitExecutionsStrategy?.singleTx!) as BroadcastMethodType,
          multiTx: (process.env.NEXT_PUBLIC_TX_MULTI_BROADCAST_TYPE ??
            !DEFAULT_PROCESS_TX_STRATEGY.splitExecutionsStrategy?.multiTx!) as BroadcastMethodType,
        },
        fallbackSequence: process.env.NEXT_PUBLIC_TX_FALLBACK_SEQUENCE
          ? JSON.parse(process.env.NEXT_PUBLIC_TX_FALLBACK_SEQUENCE)
          : DEFAULT_PROCESS_TX_STRATEGY.fallbackSequence,
      }
    : undefined;

  console.log("test: ", test);

  return test;
}
