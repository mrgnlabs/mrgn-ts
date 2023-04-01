import { nativeToUi } from "@mrgnlabs/mrgn-common";

// ================================
// START: SUPERSTAKE INSTRUCTIONS
// ================================

const makeSwapIx = async ({
  amount,
  inputTokenAddress,
  outputTokenAddress,
  slippageBps,
  tokenMap,
  routeMap,
  api,
}) => {
  const inputMint = new PublicKey(inputTokenAddress);
  const outputMint = new PublicKey(outputTokenAddress);

  const { data: routes } = await api.v4QuoteGet({
    amount,
    inputMint: inputMint.toBase58(),
    outputMint: outputMint.toBase58(),
    slippage: slippageBps / 10000,
  });

  if (!routes || routes.length === 0) {
    throw new Error("No routes found for the given input and output tokens.");
  }

  const route = routes[0];

  const inputTokenInfo = tokenMap.get(inputMint.toBase58());
  const outputTokenInfo = tokenMap.get(outputMint.toBase58());
  if (!inputTokenInfo || !outputTokenInfo) {
    throw new Error("Input or output token not found in token map.");
  }

  const validOutputMints = routeMap.get(inputMint.toBase58()) || [];
  if (!validOutputMints.includes(outputMint.toBase58())) {
    throw new Error(
      "Output token is not a valid swap route for the given input token."
    );
  }

  const swapTransaction = await api.v4SwapPost({
    body: {
      route,
      userPublicKey: "",
    },
  });

  const instructions = swapTransaction.message.instructions;

  return { instructions };
};

const makeSuperStakeIx = async ({
  initialCollateralAmount,
  depositBank,
  borrowBank,
  maxLTV,
  slippageBpsSwapTolerance = 50,
  buffer = 0.9,
  tokenMap,
  routeMap,
  api,
}) => {

  const createLoop = async ({
      initialLoopCollateralAmount
  }) => {
      const { instructions: depositIx } = await makeDepositIx({
          amount: initialLoopCollateralAmount,
          bank: depositBank,
      });
      
      const { instructions: borrowIx } = await makeBorrowIx({
          amount: initialLoopCollateralAmount * maxLTV * buffer,
          bank: borrowBank,
      });
      
      // use jupiter api
      const { instructions: swapIx } = await makeSwapIx({
          amount: initialLoopCollateralAmount * maxLTV * buffer,
          slippageBps: slippageBpsSwapTolerance,
          inputTokenAddress: borrowBank.tokenMint,
          outputTokenAddress: depositBank.tokenMint,
          tokenMap,
          routeMap,
          api,
      });
  
      return {
          instructions: [...depositIx, ...borrowIx, ...swapIx],
          LSTSOLOutputAmount: initialLoopCollateralAmount * maxLTV * buffer * (1-slippageBpsSwapTolerance/10000),
      };
  }    

  // loop 1
  const {
      instructions: LSTSOLloopInstructions1,
      LSTSOLOutputAmount: LSTSOLOutputAmount1
  } = await createLoop({
      initialCollateralAmount
  })
  
  // loop 2
  const {
      instructions: LSTSOLloopInstructions2,
      LSTSOLOutputAmount: LSTSOLOutputAmount2
  } = await createLoop({
      LSTSOLOutputAmount1
  })

  // loop 3
  const {
      instructions: LSTSOLloopInstructions3,
      LSTSOLOutputAmount: LSTSOLOutputAmount3
  } = await createLoop({
      LSTSOLOutputAmount2
  })

  // loop 4
  const {
      instructions: LSTSOLloopInstructions4,
      LSTSOLOutputAmount: LSTSOLOutputAmount4
  } = await createLoop({
      LSTSOLOutputAmount3
  })

  // final deposit
  const { instructions: finalDepositIx } = await makeDepositIx({
      amount: LSTSOLOutputAmount4,
      bank: depositBank
  });

  return {
      instructions: [
          ...LSTSOLloopInstructions1,
          ...LSTSOLloopInstructions2,
          ...LSTSOLloopInstructions3,
          ...LSTSOLloopInstructions4,
          ...finalDepositIx
      ],
      keys: []
  }
}

const makeWithdrawSuperStakeIx = async ({
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

  const createLoop = async ({
      LSTAvailableAmount
  }) => {

      // use jupiter api
      const { instructions: swapIx } = await makeSwapIx({
        amount: LSTAvailableAmount,
        slippageBps: slippageBpsSwapTolerance,
        inputTokenAddress: depositBank.tokenMint,
        outputTokenAddress: borrowBank.tokenMint,
        tokenMap,
        routeMap,
        api,
      });

      const { instructions: repayIx } = await makeRepayIx({
        amount: LSTAvailableAmount * (1-slippageBpsSwapTolerance/10000),
        bank: borrowBank,
      });

      const { instructions: withdrawIx } = await makeWithdrawIx({
          amount: LSTAvailableAmount * (1-slippageBpsSwapTolerance/10000),
          bank: depositBank,
      });
  
      return {
          instructions: [...swapIx, ...repayIx, ...withdrawIx],
          LSTSOLOutputAmount: LSTAvailableAmount * (1-slippageBpsSwapTolerance/10000),
      };
  }    

  // first withdraw
  const { 
    instructions: firstWithdrawIx,
    LSTSOLOutputAmount: LSTSOLOutputAmount0
  } = await makeWithdrawIx({
    amount: initialWithdrawableAmount,
    bank: depositBank
  });

  // reverse loop 1
  const {
      instructions: LSTSOLloopInstructions1,
      LSTSOLOutputAmount: LSTSOLOutputAmount1
  } = await createLoop({
    LSTSOLOutputAmount1
  })
  
  // reverse loop 2
  const {
      instructions: LSTSOLloopInstructions2,
      LSTSOLOutputAmount: LSTSOLOutputAmount2
  } = await createLoop({
    LSTSOLOutputAmount2
  })

  // reverse loop 3
  const {
      instructions: LSTSOLloopInstructions3,
      LSTSOLOutputAmount: LSTSOLOutputAmount3
  } = await createLoop({
    LSTSOLOutputAmount3
  })

  // reverse loop 4
  const {
      instructions: LSTSOLloopInstructions4,
      LSTSOLOutputAmount: LSTSOLOutputAmount4
  } = await createLoop({
    LSTSOLOutputAmount4
  })

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
    mfiClient: any,
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

  const superStakeIxs = await makeSuperStakeIx({
    superStakeOrWithdrawAmount,
    depositBank,
    borrowBank,
    maxLTV: nativeToUi(borrowBank.bank.config.liabilityWeightInit, borrowBank.tokenMintDecimals),
    slippageBpsSwapTolerance: 50,
    buffer: 0.9,
    tokenMap,
    routeMap,
    api,
  })

  const tx = new Transaction().add(...superStakeIxs.instructions);
  const sig = await mfiClient.processTransaction(tx)
  await reloadBanks()
}

const withdrawSuperStake = async (
    mfiClient: any,
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
    superStakeOrWithdrawAmount,
    depositBank,
    borrowBank,
    maxLTV: nativeToUi(borrowBank.bank.config.liabilityWeightInit, borrowBank.tokenMintDecimals),
    slippageBpsSwapTolerance: 50,
    buffer: 0.9,
    tokenMap,
    routeMap,
    api,
  })

  const tx = new Transaction().add(...withdrawSuperStakeIxs.instructions);
  const sig = await mfiClient.processTransaction(tx)
  await reloadBanks()
}

export {
    superStake,
    withdrawSuperstake
}
