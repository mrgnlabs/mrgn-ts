interface ExecuteActionsCallbackProps {
  captureEvent: (event: string, properties?: Record<string, any>) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsComplete: (txnSigs: string[]) => void;
  setError: (error: any) => void; // TODO: update any here
}

export type { ExecuteActionsCallbackProps };
