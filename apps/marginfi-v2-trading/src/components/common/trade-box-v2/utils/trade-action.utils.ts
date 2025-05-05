import { QuoteResponse } from "@jup-ag/api";

import {
  ActionMessageType,
  calculateLoopingParams,
  TradeActionTxns,
  STATIC_SIMULATION_ERRORS,
  CalculateTradingProps,
  createSwapTx,
  ActionProcessingError,
  addArenaTxTypes,
} from "@mrgnlabs/mrgn-utils";
import { createMarginfiAccountTx, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { nativeToUi, SolanaTransaction } from "@mrgnlabs/mrgn-common";

export async function generateTradeTx(props: CalculateTradingProps): Promise<TradeActionTxns | ActionMessageType> {
  let swapTx: { quote?: QuoteResponse; tx?: SolanaTransaction; error?: ActionMessageType } | undefined;

  const swapNeeded = props.tradeState === "long";
  if (swapNeeded) {
    try {
      swapTx = await createSwapTx({
        inputBank: props.borrowBank,
        outputBank: props.depositBank,
        swapAmount: props.depositAmount,
        authority: props.marginfiClient.wallet.publicKey,
        connection: props.marginfiClient.provider.connection,
        jupiterOptions: {
          slippageMode: props.slippageMode,
          slippageBps: props.slippageBps,
          directRoutesOnly: false,
        },
        platformFeeBps: props.platformFeeBps,
      });
    } catch (error) {
      console.error("Setup swap transaction error:", error);
      throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.JUP_QUOTE_FAILED);
    }
  }

  // Marginfi Account
  let hasMarginfiAccount = !!props.marginfiAccount;
  const hasBalances = props.marginfiAccount?.activeBalances?.length ?? 0 > 0;

  if (hasMarginfiAccount && !hasBalances && props.marginfiAccount) {
    const accountInfo = await props.marginfiClient.provider.connection.getAccountInfo(props.marginfiAccount.address);
    hasMarginfiAccount = accountInfo !== null;
  }

  let accountCreationTx: SolanaTransaction[] = [];
  let finalAccount: MarginfiAccountWrapper | null = props.marginfiAccount;
  if (!hasMarginfiAccount) {
    const { account, tx } = await createMarginfiAccountTx({
      marginfiAccount: props.marginfiAccount,
      marginfiClient: props.marginfiClient,
    });
    finalAccount = account;
    accountCreationTx.push(tx);
  }

  let finalDepositAmount = props.depositAmount;

  if (swapNeeded && !swapTx?.quote) {
    return STATIC_SIMULATION_ERRORS.FL_FAILED;
  } else if (swapNeeded && swapTx?.quote) {
    finalDepositAmount = Number(nativeToUi(swapTx?.quote?.outAmount, props.depositBank.info.state.mintDecimals));
  }

  const result = await calculateLoopingParams({
    ...props,
    setupBankAddresses: [props.borrowBank.address],
    marginfiAccount: finalAccount,
    depositAmount: finalDepositAmount,
    overrideInferAccounts: {
      group: props.marginfiClient.group.address,
      authority: props.marginfiClient.provider.publicKey,
    },
  });

  if (result && "actionQuote" in result) {
    return {
      ...result,
      transactions: [
        ...(swapTx?.tx ? [swapTx.tx] : []),
        ...accountCreationTx,
        ...addArenaTxTypes(result.transactions, props.tradeState),
      ],
      marginfiAccount: finalAccount ?? undefined,
    };
  }

  return result;
}
