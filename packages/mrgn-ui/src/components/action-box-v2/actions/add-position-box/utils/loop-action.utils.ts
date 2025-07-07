import { QuoteResponse } from "@jup-ag/api";
import { createMarginfiAccountTx, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { nativeToUi, SolanaTransaction } from "@mrgnlabs/mrgn-common";
import {
  calculateLoopingParams,
  createSwapTx,
  addArenaTxTypes,
  JupiterOptions,
  LoopActionTxns,
  CalculateTradingProps,
  TradeActionTxns,
  ActionProcessingError,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";
import { Connection } from "@solana/web3.js";
import { BigNumber } from "bignumber.js";

type GenerateAddPositionTxnsProps = {
  marginfiClient: MarginfiClient;
  marginfiAccount: MarginfiAccountWrapper | null;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  amount: number;
  targetLeverage: number;
  platformFeeBps: number;
  jupiterOptions: JupiterOptions;
  tradeState: "long" | "short";
};

export async function generateAddPositionTxns(props: CalculateTradingProps): Promise<TradeActionTxns> {
  let finalDepositAmount = props.depositAmount;
  let account = props.marginfiAccount;
  let accountQuote: QuoteResponse | null = null;
  const transactions: SolanaTransaction[] = [];

  if (props.tradeState === "long") {
    const { quote: swapQuote, tx: swapTx } = await createSwapTx({
      inputBank: props.borrowBank,
      outputBank: props.depositBank,
      swapAmount: props.depositAmount,
      authority: props.marginfiClient.wallet.publicKey,
      connection: props.marginfiClient.provider.connection,
      jupiterOptions: {
        slippageBps: props.slippageBps,
        slippageMode: props.slippageMode,
        directRoutesOnly: false,
      },
      platformFeeBps: props.platformFeeBps,
    });
    transactions.push(swapTx);
    finalDepositAmount = Number(nativeToUi(swapQuote.outAmount, props.depositBank.info.state.mintDecimals));
  }

  if (!(await hasMarginfiAccount(props.marginfiClient.provider.connection, account))) {
    const { account: newAccount, tx: createAccTx } = await createMarginfiAccountTx({
      marginfiAccount: props.marginfiAccount,
      marginfiClient: props.marginfiClient,
    });
    transactions.push(createAccTx);
    account = newAccount;
  }

  if (!account) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
  }

  let actualDepositAmount = 0;
  let borrowAmount = new BigNumber(0);

  if (props.targetLeverage === 1) {
    const deposit = await account.makeDepositTx(finalDepositAmount, props.depositBank.address);
    transactions.push(deposit);
  } else {
    const loopActionTxns = await calculateLoopingParams({
      ...props,
      setupBankAddresses: [props.borrowBank.address],
      marginfiAccount: account,
      depositAmount: finalDepositAmount,
      slippageBps: props.slippageBps,
      slippageMode: props.slippageMode,
      connection: props.marginfiClient.provider.connection,
    });

    accountQuote = loopActionTxns.actionQuote;
    actualDepositAmount = loopActionTxns.actualDepositAmount;
    borrowAmount = loopActionTxns.borrowAmount;
    transactions.push(...addArenaTxTypes(loopActionTxns.transactions, props.tradeState));
  }

  return {
    actionQuote: accountQuote,
    marginfiAccount: account ?? undefined,
    transactions,
    actualDepositAmount: actualDepositAmount,
    borrowAmount: borrowAmount,
  };
}

async function hasMarginfiAccount(
  connection: Connection,
  marginfiAccount?: MarginfiAccountWrapper | null
): Promise<boolean> {
  let hasMarginfiAccount = !!marginfiAccount;
  const hasBalances = marginfiAccount?.activeBalances?.length ?? 0 > 0;

  if (hasMarginfiAccount && !hasBalances && marginfiAccount) {
    const accountInfo = await connection.getAccountInfo(marginfiAccount.address);
    hasMarginfiAccount = accountInfo !== null;
  }

  return hasMarginfiAccount;
}
