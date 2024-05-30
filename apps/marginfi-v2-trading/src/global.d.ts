interface Window {
  MayanSwap: {
    init: (id: string, config: import("./types").MayanWidgetConfigType) => void;
    updateConfig: (
      newConfig: import("./types").MayanWidgetConfigType | import("./types").MayanWidgetSolanaConfigType
    ) => void;
    setSwapInitiateListener(callback: (swap: import("./types").MayanSwapInfo) => void): void;
    removeSwapInitiateListener(): void;
    setSwapCompleteListener(callback: (swap: import("./types").MayanSwapInfo) => void): void;
    removeSwapCompleteListener(): void;
    setSwapRefundListener(callback: (swap: import("./types").MayanSwapInfo) => void): void;
    removeSwapRefundListener(): void;
  };
  Jupiter: any;
  MoonPayWebSdk: any;
  deBridge: any;
}
