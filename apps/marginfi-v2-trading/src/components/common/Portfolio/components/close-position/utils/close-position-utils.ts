import { Connection } from "@solana/web3.js";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { SolanaTransaction } from "@mrgnlabs/mrgn-common";
import {
  ArenaGroupStatus,
  ActionProcessingError,
  ClosePositionActionTxns,
  STATIC_SIMULATION_ERRORS,
  createSwapTx,
  JupiterOptions,
} from "@mrgnlabs/mrgn-utils";

import { calculateClosePositions } from "~/utils";

/**
 * Simulates closing a position by fetching and validating the required transactions
 */
export const simulateClosePosition = async ({
  marginfiAccount,
  depositBanks,
  borrowBank,
  jupiterOptions,
  connection,
  platformFeeBps,
  tradeState,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBanks: ActiveBankInfo[];
  borrowBank: ActiveBankInfo | null;
  jupiterOptions: JupiterOptions | null;
  connection: Connection;
  platformFeeBps: number;
  tradeState: ArenaGroupStatus;
}): Promise<{ actionTxns: ClosePositionActionTxns }> => {
  if (!marginfiAccount) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
  }
  if (depositBanks.length === 0 || !borrowBank) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.BANK_NOT_INITIALIZED);
  }
  if (!jupiterOptions) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.JUPITER_OPTIONS_NOT_INITIALIZED);
  }

  const { actionTxns } = await fetchClosePositionTxns({
    marginfiAccount,
    depositBank: depositBanks[0],
    borrowBank: borrowBank,
    jupiterOptions,
    connection: connection,
    platformFeeBps,
    tradeState,
  });

  return { actionTxns };
};

const fetchClosePositionTxns = async (props: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ActiveBankInfo;
  borrowBank: ActiveBankInfo;
  jupiterOptions: JupiterOptions;
  connection: Connection;
  platformFeeBps: number;
  tradeState: ArenaGroupStatus;
}): Promise<{ actionTxns: ClosePositionActionTxns }> => {
  let txns: ClosePositionActionTxns;

  txns = await calculateClosePositions({
    marginfiAccount: props.marginfiAccount,
    depositBanks: [props.depositBank],
    borrowBank: props.borrowBank,
    jupiterOptions: props.jupiterOptions,
    connection: props.connection,
    platformFeeBps: props.platformFeeBps,
  });

  // if the trade state is long, we need to swap to the Quote token again
  if (props.tradeState === ArenaGroupStatus.LONG) {
    const swapTx = await createSwapTx({
      ...props,
      inputBank: props.depositBank,
      outputBank: props.borrowBank,
      authority: props.marginfiAccount.authority,
      jupiterOptions: props.jupiterOptions,
      swapAmount: props.depositBank.position.amount - txns.maxAmount,
    });
    txns = {
      ...txns,
      closeTransactions: swapTx.tx ? [swapTx.tx] : [],
    };
  }

  // close marginfi account
  const closeAccountTx = await getCloseAccountTx(props.marginfiAccount);

  txns = {
    ...txns,
    closeTransactions: [...(txns.closeTransactions ?? []), closeAccountTx],
  };

  return { actionTxns: txns };
};

/**
 * Creates a transaction to close a marginfi account
 */
async function getCloseAccountTx(marginfiAccount: MarginfiAccountWrapper): Promise<SolanaTransaction> {
  return marginfiAccount.makeCloseAccountTx();
}
