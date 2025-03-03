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
} from "@mrgnlabs/mrgn-utils";
import { Connection } from "@solana/web3.js";

type GenerateAddPositionTxnsProps = {
  marginfiClient: MarginfiClient;
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  amount: number;
  targetLeverage: number;
  platformFeeBps: number;
  jupiterOptions: JupiterOptions;
  tradeState: "long" | "short";
};

export async function generateAddPositionTxns(props: GenerateAddPositionTxnsProps): Promise<LoopActionTxns> {
  let finalDepositAmount = props.amount;
  let account = props.marginfiAccount;
  const transactions: SolanaTransaction[] = [];

  if (props.tradeState === "long") {
    const { quote: swapQuote, tx: swapTx } = await createSwapTx({
      inputBank: props.borrowBank,
      outputBank: props.depositBank,
      swapAmount: props.amount,
      authority: props.marginfiClient.wallet.publicKey,
      connection: props.marginfiClient.provider.connection,
      jupiterOptions: props.jupiterOptions,
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
    slippageBps: props.jupiterOptions.slippageBps,
    slippageMode: props.jupiterOptions.slippageMode,
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
