interface ExecuteActionsCallbackProps {
  captureEvent: (event: string, properties?: Record<string, any>) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsComplete: (txnSigs: string[]) => void;
  setIsError: (error: string) => void;
}

export type { ExecuteActionsCallbackProps };
