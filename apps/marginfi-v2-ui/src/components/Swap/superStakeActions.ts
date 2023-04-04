import { PublicKey, VersionedTransaction, TransactionMessage, Connection } from "@solana/web3.js";
import { MarginfiAccount, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk';
import { uiToNative, nativeToUi } from '@mrgnlabs/mrgn-common';
import { ExtendedBankInfo } from '~/types';
import { WalletContextState } from "@solana/wallet-adapter-react";

// ================================
// START: SUPERSTAKE INSTRUCTIONS
// ================================

interface SwapParams {
  wallet: WalletContextState;
  connection: Connection;
  amount: number;
  inputTokenMintDecimals: number;
}

const makeSwapIx = async ({
  wallet,
  connection,
  amount,
  inputTokenMintDecimals,
}: SwapParams) => {

  const config = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
  })

  const marinade = new Marinade(config)
  const tx = await marinade.deposit(uiToNative(amount, inputTokenMintDecimals))

  const ix = tx.transaction.instructions

  return {
    instructions: ix
  }
};

interface SuperStakeParams {
  wallet: WalletContextState;
  connection: Connection;
  marginfiAccount: MarginfiAccount;
  initialCollateralAmount: number;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  maxLTV: number;
  buffer?: number;
}

const makeSuperStakeIx = async ({
  wallet,
  connection,
  marginfiAccount,
  initialCollateralAmount,
  depositBank,
  borrowBank,
  maxLTV,
  buffer = 0.99,
}: SuperStakeParams) => {

  const createLoop = async (
      initialLoopCollateralAmount: number
  ) => {

      const { instructions: depositIx } = await marginfiAccount.makeDepositIx(
        initialLoopCollateralAmount,
        depositBank.bank,
      );

      const calcSOLAmount = initialLoopCollateralAmount * 
        maxLTV * 
        (
          depositBank.tokenPrice / borrowBank.tokenPrice
        ) *
        buffer

      // borrow logic
      const { instructions: borrowIx } = await marginfiAccount.makeBorrowIx(
        calcSOLAmount,
        borrowBank.bank,
        { remainingAccountsBankOverride: [depositBank.bank, borrowBank.bank] }
      );

      // use jupiter api
      const { instructions: swapIx } = await makeSwapIx({
          wallet,
          connection,
          amount: calcSOLAmount,
          inputTokenMintDecimals: borrowBank.bank.mintDecimals,
      });
  
      return {
          instructions: [...depositIx, ...borrowIx, ...swapIx],
          // @todo we can do better at estimating how much output LSTSOL we're going to have here.
          // Right now we're calculating the expected fx based on the token price and using a 5% buffer.
          // Impact here is that if we calculate wrong (i.e. we expect more LSTSOL than we actually get),
          // then the transaction will fail so users should stay safe.
          LSTSOLOutputAmount: calcSOLAmount / (depositBank.tokenPrice / borrowBank.tokenPrice) * 0.95,
      };
  }

  // loop 1
  const {
      instructions: LSTSOLloopInstructions1,
      LSTSOLOutputAmount: LSTSOLOutputAmount1,
  } = await createLoop(initialCollateralAmount)
  
  // loop 2
  const {
      instructions: LSTSOLloopInstructions2,
      LSTSOLOutputAmount: LSTSOLOutputAmount2,
  } = await createLoop(LSTSOLOutputAmount1)

  // loop 3
  const {
      instructions: LSTSOLloopInstructions3,
      LSTSOLOutputAmount: LSTSOLOutputAmount3,
  } = await createLoop(LSTSOLOutputAmount2)

  // loop 4
  const {
      instructions: LSTSOLloopInstructions4,
      LSTSOLOutputAmount: LSTSOLOutputAmount4,
  } = await createLoop(LSTSOLOutputAmount3)

  // final deposit
  const { instructions: finalDepositIx } = await marginfiAccount.makeDepositIx(
      LSTSOLOutputAmount4,
      depositBank.bank,
  );

  return {
      instructions: [
          ...LSTSOLloopInstructions1,
          ...LSTSOLloopInstructions2,
          ...LSTSOLloopInstructions3,
          ...LSTSOLloopInstructions4,
          ...finalDepositIx
      ],
  }
}

const makeWithdrawSuperStakeIx = async ({
  wallet,
  connection,
  marginfiAccount,
  initialWithdrawableAmount, // need to figure this out
  depositBank,
  borrowBank,
  maxLTV,
  slippageBpsSwapTolerance = 50,
  buffer = 0.9,
  tokenMap,
  routeMap,
  api,
}) => {

  const createLoop = async (LSTAvailableAmount) => {

      // use jupiter api
      const { instructions: swapIx } = await makeSwapIx({
        marginfiAccount,
        amount: LSTAvailableAmount,
        slippageBps: slippageBpsSwapTolerance,
        inputTokenAddress: depositBank.tokenMint,
        outputTokenAddress: borrowBank.tokenMint,
        inputTokenMintDecimals: depositBank.bank.mintDecimals,
        tokenMap,
        routeMap,
        api,
      });

      const { instructions: repayIx } = await marginfiAccount.makeRepayIx(
        LSTAvailableAmount * (1-slippageBpsSwapTolerance/10000),
        borrowBank,
      );

      const { instructions: withdrawIx } = await marginfiAccount.makeWithdrawIx(
          LSTAvailableAmount * (1-slippageBpsSwapTolerance/10000),
          depositBank,
      );
  
      return {
          instructions: [...swapIx, ...repayIx, ...withdrawIx],
          LSTSOLOutputAmount: LSTAvailableAmount * (1-slippageBpsSwapTolerance/10000),
      };
  }    

  // first withdraw
  const { 
    instructions: firstWithdrawIx,
    LSTSOLOutputAmount: LSTSOLOutputAmount0
  } = await marginfiAccount.makeWithdrawIx(
    initialWithdrawableAmount,
    depositBank
  );

  // reverse loop 1
  const {
      instructions: LSTSOLloopInstructions1,
      LSTSOLOutputAmount: LSTSOLOutputAmount1
  } = await createLoop(LSTSOLOutputAmount1)
  
  // reverse loop 2
  const {
      instructions: LSTSOLloopInstructions2,
      LSTSOLOutputAmount: LSTSOLOutputAmount2
  } = await createLoop(LSTSOLOutputAmount2)

  // reverse loop 3
  const {
      instructions: LSTSOLloopInstructions3,
      LSTSOLOutputAmount: LSTSOLOutputAmount3
  } = await createLoop(LSTSOLOutputAmount3)

  // reverse loop 4
  const {
      instructions: LSTSOLloopInstructions4,
      LSTSOLOutputAmount: LSTSOLOutputAmount4
  } = await createLoop(LSTSOLOutputAmount4)

  return {
      instructions: [
          ...firstWithdrawIx,
          ...LSTSOLloopInstructions1,
          ...LSTSOLloopInstructions2,
          ...LSTSOLloopInstructions3,
          ...LSTSOLloopInstructions4,
      ],
      keys: []
  }
}

// ================================
// END: SUPERSTAKE INSTRUCTIONS
// ================================

// ================================
// START: SUPERSTAKE HELPERS
// ================================

const superStake = async (
    marginfiAccount: MarginfiAccount,
    connection: Connection,
    wallet: WalletContextState,
    superStakeOrWithdrawAmount: number,
    depositBank: ExtendedBankInfo,
    borrowBank: ExtendedBankInfo,
    reloadBanks: () => void,
) => {

  if (!wallet.publicKey) return;

  const superStakeIxs = await makeSuperStakeIx({
    wallet,
    connection,
    marginfiAccount,
    initialCollateralAmount: superStakeOrWithdrawAmount,
    depositBank,
    borrowBank,
    maxLTV: nativeToUi(depositBank.bank.config.assetWeightInit, 0) / nativeToUi(borrowBank.bank.config.liabilityWeightInit, 0),
    buffer: 0.99,
  })

  const lutAccount = await connection.getAddressLookupTable(new PublicKey("B3We5gAbzUCWYvp85rGMyAhsDCV9wypk7dXG7FyETdQ3")).then((res) => res.value)
  if (!lutAccount) {
    throw new Error("LUT account not found");
  }

  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
    instructions: superStakeIxs.instructions,
  }).compileToV0Message([lutAccount]);
  const tx = new VersionedTransaction(messageV0)

  const txid = await wallet.sendTransaction(tx, connection, {
    skipPreflight: true,
  });
  console.log(txid)

  await reloadBanks()
}

const withdrawSuperstake = async (
    mfiClient: MarginfiClient,
    marginfiAccount: MarginfiAccount,
    connection: Connection,
    wallet: Wallet,
    superStakeOrWithdrawAmount: number,
    depositBank: ExtendedBankInfo,
    borrowBank: ExtendedBankInfo,
    reloadBanks: () => void,
    tokenMap,
    routeMap,
    api
) => {

  const withdrawSuperStakeIxs = await makeWithdrawSuperStakeIx({
    wallet,
    connection,
    marginfiAccount,
    initialWithdrawableAmount: superStakeOrWithdrawAmount,
    depositBank,
    borrowBank,
    maxLTV: depositBank.bank.config.assetWeightInit / borrowBank.bank.config.liabilityWeightInit, // @todo DOUBLE CHECK
    slippageBpsSwapTolerance: 50,
    buffer: 0.9,
    tokenMap,
    routeMap,
    api,  
  })

  const lutAccount = await connection.getAddressLookupTable(new PublicKey("B3We5gAbzUCWYvp85rGMyAhsDCV9wypk7dXG7FyETdQ3")).then((res) => res.value)

  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: (await connection.getRecentBlockhash()).blockhash,
    instructions: withdrawSuperStakeIxs.instructions,
  }).compileToV0Message([lutAccount]);
  const tx = new VersionedTransaction(messageV0)
  const txid = await wallet.sendTransaction(tx, connection, {
    skipPreflight: true,
  });
  console.log(txid)

  await reloadBanks()
}

export {
    superStake,
    withdrawSuperstake
}
