import { Jupiter } from '@jup-ag/core';
import config from '~/config';
import { nativeToUi } from "@mrgnlabs/mrgn-common";

// ================================
// START: JUPITER SETUP
// ================================

class WalletSigner {
  constructor(wallet) {
    this.wallet = wallet;
  }

  get publicKey() {
    return this.wallet.publicKey;
  }

  async signTransaction(transaction) {
    return await this.wallet.signTransaction(transaction);
  }
}

const loadJupiter = async ({
  wallet,
  connection,
}) => {
  const walletSigner = new WalletSigner(wallet);

  const jupiter = await Jupiter.load({
    connection,
    cluster: config.mfiConfig.environment,
    user: walletSigner,
  });

  return jupiter;
}

// ================================
// END: JUPITER SETUP
// ================================

// ================================
// START: SUPERSTAKE INSTRUCTIONS
// ================================

const makeSwapIx = async ({ jupiter, amount, inputTokenAddress, outputTokenAddress, slippageBps }) => {
  const routes = await jupiter.computeRoutes({
    inputMint: new PublicKey(inputTokenAddress),
    outputMint: new PublicKey(outputTokenAddress),
    amount:  JSBI.BigInt(amount),
    slippageBps: slippageBps,
  });

  const bestRoute = routes.routesInfos[0];
  const { swapTransaction, addressLookupTableAccounts } = await jupiter.exchange({ routeInfo: bestRoute });

  return {
    instructions: swapTransaction.message.instructions,
    addressLookupTableAccounts,
  };
};

const makeSuperStakeIx = async ({
  initialCollateralAmount,
  depositBank,
  borrowBank,
  maxLTV,
  slippageBpsSwapTolerance = 50,
  buffer = 0.9
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
          jupiter,
          amount: initialLoopCollateralAmount * maxLTV * buffer,
          slippageBps: slippageBpsSwapTolerance,
          inputTokenAddress: borrowBank.tokenMint,
          outputTokenAddress: depositBank.tokenMint,
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
) => {
  const jupiter = loadJupiter({
    wallet,
    connection,
  });

  const superStakeIxs = await makeSuperStakeIx({
    superStakeOrWithdrawAmount,
    depositBank,
    borrowBank,
    maxLTV: nativeToUi(borrowBank.bank.config.liabilityWeightInit, borrowBank.tokenMintDecimals),
    slippageBpsSwapTolerance: 50,
    buffer: 0.9
  })

  const tx = new Transaction().add(...superStakeIxs.instructions);
  const sig = await mfiClient.processTransaction(tx)
  await reloadBanks()
}

const withdrawSuperstake = () => {}

export {
    superStake,
    withdrawSuperstake
}
