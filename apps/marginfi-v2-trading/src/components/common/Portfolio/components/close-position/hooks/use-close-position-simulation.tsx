// import React from "react";

// import { ArenaPoolPositions } from "~/types/trade-store.types";

// import { ArenaPoolV2Extended } from "~/types/trade-store.types";

// import {
//   ActionMessageType,
//   ClosePositionActionTxns,
//   DYNAMIC_SIMULATION_ERRORS,
//   MultiStepToastHandle,
//   STATIC_SIMULATION_ERRORS,
// } from "@mrgnlabs/mrgn-utils";
// import { ArenaBank } from "~/types/trade-store.types";
// import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
// import { calculateClosePositions } from "~/utils";
// import { Connection } from "@solana/web3.js";
// import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

// export type ClosePositionSimulationProps = {
//   arenaPool: ArenaPoolV2Extended;
//   actionTransaction: ClosePositionActionTxns | null;
//   positionsByGroupPk: Record<string, ArenaPoolPositions>;
//   depositBanks: ActiveBankInfo[];
//   borrowBank: ActiveBankInfo | null;
//   marginfiAccount: MarginfiAccountWrapper | null;
//   slippageBps: number;
//   connection: Connection;
//   platformFeeBps: number;

//   setActionTxns: (actionTxns: ClosePositionActionTxns | null) => void;
//   setErrorMessage: (error: ActionMessageType | null) => void;
//   setIsLoading: (isLoading: boolean) => void;
//   //   setSimulationResult: (result: SimulationResult | null) => void;
//   setMultiStepToast: (multiStepToast: MultiStepToastHandle | null) => void;
// };

// export function useClosePositionSimulation({
//   marginfiAccount,
//   depositBanks,
//   borrowBank,
//   slippageBps,
//   connection,
//   platformFeeBps,

//   setActionTxns,
//   setErrorMessage,
//   setIsLoading,
//   setMultiStepToast,
// }: //   setSimulationResult,
// ClosePositionSimulationProps) {
//   const simulationAction = async () => {}; // TODO: we are not doing any simulation for these transactions, we should

//   const fetchClosePositionTxns = async (props: {
//     marginfiAccount: MarginfiAccountWrapper;
//     depositBanks: ActiveBankInfo[];
//     borrowBank: ActiveBankInfo | null;
//     slippageBps: number;
//     connection: Connection;
//     platformFeeBps: number;
//   }): Promise<{ actionTxns: ClosePositionActionTxns | null; actionMessage: ActionMessageType | null }> => {
//     try {
//       const txns = await calculateClosePositions({
//         marginfiAccount: props.marginfiAccount,
//         depositBanks: props.depositBanks,
//         borrowBank: props.borrowBank,
//         slippageBps: props.slippageBps,
//         connection: props.connection,
//         platformFeeBps: props.platformFeeBps,
//       });

//       if ("actionTxn" in txns) {
//         return { actionTxns: txns, actionMessage: null };
//       } else {
//         const errorMessage = txns ?? DYNAMIC_SIMULATION_ERRORS.TRADE_FAILED_CHECK();
//         return { actionTxns: null, actionMessage: errorMessage };
//       }
//     } catch (error) {
//       return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.TRADE_FAILED };
//     }
//   };

//   const handleSimulation = React.useCallback(async () => {
//     const multiStepToast = new MultiStepToastHandle("Closing position", [
//       { label: "Loading details..." },
//       { label: "Signing transaction" },
//       {
//         label: `Closing ${depositBanks[0].meta.tokenSymbol}${
//           borrowBank ? "/" + borrowBank?.meta.tokenSymbol : ""
//         } position.`,
//       },
//     ]);
//     try {
//       if (!marginfiAccount || !depositBanks[0] || !borrowBank) {
//         throw new Error("Invalid input"); // TODO: handle
//       }

//       setIsLoading(true);

//       multiStepToast.start();

//       const { actionTxns, actionMessage } = await fetchClosePositionTxns({
//         marginfiAccount,
//         depositBanks: depositBanks,
//         borrowBank: borrowBank,
//         slippageBps,
//         connection: connection,
//         platformFeeBps,
//       });

//       if (actionMessage || actionTxns === null) {
//         return; // TODO: handle
//       }

//       setActionTxns(actionTxns);
//     } catch (error) {
//       console.error("Error simulating transaction", error);
//       setActionTxns(null);
//       multiStepToast.setFailed("Error simulating transaction"); // TODO: set correct error message
//     } finally {
//       setIsLoading(false);
//       setMultiStepToast(multiStepToast);
//     }
//   }, [
//     borrowBank,
//     connection,
//     depositBanks,
//     marginfiAccount,
//     platformFeeBps,
//     setActionTxns,
//     setIsLoading,
//     slippageBps,
//     setMultiStepToast,
//   ]);

//   return { handleSimulation };
// }
