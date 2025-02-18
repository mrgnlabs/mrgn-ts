import {
  ActionMessageType,
  calculateLoopingParams,
  CalculateLoopingProps,
  LoopActionTxns,
} from "@mrgnlabs/mrgn-utils";


export async function calculateLooping(props: CalculateLoopingProps): Promise<LoopActionTxns | ActionMessageType> {

  const params = {
    ...props,
    setupBankAddresses: [props.depositBank.address, props.borrowBank.address],
  };

  const result = await calculateLoopingParams(params);

  return result;
}
