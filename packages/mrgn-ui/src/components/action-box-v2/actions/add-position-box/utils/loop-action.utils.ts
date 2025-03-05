import { createMarginfiAccountTx, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { nativeToUi, SolanaTransaction } from "@mrgnlabs/mrgn-common";
import {
  calculateLoopingParams,
  createSwapTx,
  addArenaTxTypes,
  JupiterOptions,
  LoopActionTxns,
  CalculateTradingProps,
  TradeActionTxns,
} from "@mrgnlabs/mrgn-utils";
import { Connection } from "@solana/web3.js";

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

  const loopActionTxns = await calculateLoopingParams({
    ...props,
    setupBankAddresses: [props.borrowBank.address],
    marginfiAccount: account,
    depositAmount: finalDepositAmount,
    slippageBps: props.slippageBps,
    slippageMode: props.slippageMode,
    connection: props.marginfiClient.provider.connection,
  });

  return {
    ...loopActionTxns,
    transactions: [...transactions, ...addArenaTxTypes(loopActionTxns.transactions, props.tradeState)],
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
