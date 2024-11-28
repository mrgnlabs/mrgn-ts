import { IndividualFlowError } from "@mrgnlabs/mrgn-utils";

interface ExecuteActionsCallbackProps {
  captureEvent: (event: string, properties?: Record<string, any>) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsComplete: (txnSigs: string[]) => void;
  setError: (error: IndividualFlowError) => void;
}

export type { ExecuteActionsCallbackProps };
