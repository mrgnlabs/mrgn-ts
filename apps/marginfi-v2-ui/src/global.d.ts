interface Window {
  MayanSwap: {
    init: (id: string, config: MayanWidgetConfigType) => void;
    updateSolanaWallet: (newData: SolanaWalletData) => void;
    updateConfig: (newConfig: MayanWidgetConfigType | MayanWidgetSolanaConfigType) => void;
    setSwapInitiateListener(callback: (swap: MayanSwapInfo) => void): void;
    removeSwapInitiateListener(): void;
    setSwapCompleteListener(callback: (swap: MayanSwapInfo) => void): void;
    removeSwapCompleteListener(): void;
    setSwapRefundListener(callback: (swap: MayanSwapInfo) => void): void;
    removeSwapRefundListener(): void;
  };
  Jupiter: any;
  MoonPayWebSdk: any;
}
