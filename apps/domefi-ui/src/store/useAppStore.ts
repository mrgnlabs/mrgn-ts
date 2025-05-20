import { Connection, PublicKey } from "@solana/web3.js";
import { buildMixAddress, MixinApi, SafeUtxoOutput, Keystore, UserResponse } from "@mixin.dev/mixin-node-sdk";
import {
  UserAssetBalance,
  UserAssetBalanceWithoutAsset,
  ComputerAssetResponse,
  ComputerInfoResponse,
  ComputerUserResponse,
  initComputerClient,
  SOL_ASSET_ID,
  add,
  NATIVE_MINT,
} from "@mrgnlabs/mrgn-common";
import { create, StateCreator } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";

export type MixinClient = ReturnType<typeof MixinApi>;

interface AppState {
  // State
  user?: UserResponse;
  keystore?: Keystore;
  balances: Record<string, UserAssetBalance>;
  balanceAddressMap: Record<string, UserAssetBalance>;
  info?: ComputerInfoResponse;
  account?: ComputerUserResponse;
  connection?: Connection;
  publicKey?: PublicKey;
  initialing: boolean;
  connected: boolean;

  // Actions
  getMixinClient: () => MixinClient;
  setKeystore: (k: Keystore) => MixinClient;
  getMe: () => Promise<void>;
  updateBalances: (cas: ComputerAssetResponse[]) => Promise<void>;
  getUserMix: () => string;
  getComputerInfo: () => Promise<void>;
  getComputerAccount: () => Promise<void>;
  getComputerRecipient: () => string;
  clear: () => void;
}

const initAppState = {
  balances: {},
  balanceAddressMap: {},
  initialing: false,
  connected: false,
};

const client = initComputerClient();

type AppStorePersist = (config: StateCreator<AppState>, options: PersistOptions<AppState>) => StateCreator<AppState>;

const createAppStore = () => {
  return create<AppState>()(
    (persist as AppStorePersist)(
      (set: (state: Partial<AppState>) => void, get: () => AppState) => ({
        // State
        ...initAppState,

        // Actions
        setKeystore: (keystore: Keystore) => {
          set({ keystore });
          return MixinApi({ keystore });
        },

        getMixinClient: () => {
          const { keystore } = get();
          return MixinApi({ keystore });
        },

        getMe: async () => {
          const { keystore } = get();
          if (!keystore) return;
          const mc = MixinApi({ keystore });
          try {
            const user = await mc.user.profile();
            const mix = buildMixAddress({
              version: 2,
              xinMembers: [],
              uuidMembers: [user.user_id],
              threshold: 1,
            });
            const account = await client.fetchUser(mix);
            if (account)
              set({
                user,
                account,
                connected: true,
                publicKey: new PublicKey(account.chain_address),
              });
            else set({ user });
          } catch {}
        },

        getUserMix: () => {
          const { user } = get();
          if (!user) return "";
          return buildMixAddress({
            version: 2,
            xinMembers: [],
            uuidMembers: [user.user_id],
            threshold: 1,
          });
        },

        updateBalances: async (as: ComputerAssetResponse[]) => {
          const { user, getMixinClient } = get();
          if (!user) return;
          const client = getMixinClient();
          const members = [user.user_id];
          let offset = 0;
          let total: SafeUtxoOutput[] = [];
          while (true) {
            const outputs = await client.utxo.safeOutputs({
              limit: 500,
              members,
              threshold: 1,
              state: "unspent",
              offset,
            });
            total = [...total, ...outputs];
            if (outputs.length < 500) {
              break;
            }
            offset = outputs[outputs.length - 1].sequence + 1;
          }
          const bm = total.reduce(
            (prev, cur) => {
              const key = cur.asset_id;
              if (prev[key]) {
                prev[key].outputs = [...prev[key].outputs, cur];
                prev[key].total_amount = add(prev[key].total_amount, cur.amount).toString();
              } else {
                const address = as.find((a) => a.asset_id === cur.asset_id)?.address;
                prev[key] = {
                  asset_id: cur.asset_id,
                  total_amount: cur.amount,
                  outputs: [cur],
                  address,
                };
              }
              return prev;
            },
            {} as Record<string, UserAssetBalanceWithoutAsset>
          );
          const assets = await client.safe.fetchAssets(Object.keys(bm));

          const fbm = assets.reduce(
            (prev, cur) => {
              const b = bm[cur.asset_id];
              const v: UserAssetBalance = { ...b, asset: cur };
              if (cur.chain_id === SOL_ASSET_ID) v.address = cur.asset_key;
              prev[cur.asset_id] = v;
              return prev;
            },
            {} as Record<string, UserAssetBalance>
          );
          
          const bs = Object.values(fbm).filter((b) => b.address);
          // const am = Object.fromEntries(bs.map((b) => [b.address, b])) as Record<string, UserAssetBalance>;
          // 转换地址
          const convertedBs = bs.map((b) => ({
            ...b,
            address: b.address === "11111111111111111111111111111111" ? NATIVE_MINT.toBase58() : b.address,
          }));
          const am = Object.fromEntries(convertedBs.map((b) => [b.address, b])) as Record<string, UserAssetBalance>;

          set({ balances: fbm, balanceAddressMap: am });
        },

        getComputerInfo: async () => {
          const info = await client.fetchInfo();
          if (info) set({ info });
        },

        getComputerAccount: async () => {
          const { user, getUserMix } = get();
          if (!user) return;
          const account = await client.fetchUser(getUserMix());
          if (account)
            set({
              account,
              connected: true,
              publicKey: new PublicKey(account.chain_address),
            });
        },

        getComputerRecipient: () => {
          const { info } = get();
          if (!info) return "";
          return buildMixAddress({
            version: 2,
            xinMembers: [],
            uuidMembers: info.members.members,
            threshold: info.members.threshold,
          });
        },

        clear: () => {
          set({
            user: undefined,
            keystore: undefined,
            balances: {},
            balanceAddressMap: {},
            info: undefined,
            account: undefined,
          });
        },
      }),
      {
        name: "appStore",
      }
    )
  );
};

export { createAppStore };
export type { AppState };
