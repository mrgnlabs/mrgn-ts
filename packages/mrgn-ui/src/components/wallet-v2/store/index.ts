import { StoreApi, UseBoundStore } from "zustand";
import { WalletState, createWalletStore } from "~/components/wallet-v2/store/wallet-store";

const useWalletStore: UseBoundStore<StoreApi<WalletState>> = createWalletStore();

export { useWalletStore };
export type { WalletState };
