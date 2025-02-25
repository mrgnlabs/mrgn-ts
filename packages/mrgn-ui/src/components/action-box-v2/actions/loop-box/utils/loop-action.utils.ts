import { calculateLoopingParams, CalculateLoopingProps, LoopActionTxns } from "@mrgnlabs/mrgn-utils";

export async function calculateLooping(props: CalculateLoopingProps): Promise<LoopActionTxns> {
  const params = {
    ...props,
    setupBankAddresses: [props.depositBank.address, props.borrowBank.address],
  };

  return await calculateLoopingParams(params);
}
