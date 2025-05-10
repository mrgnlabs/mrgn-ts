import { initComputerClient } from "../utils";
import { create, StateCreator } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";
import { useAppStore } from ".";
import { ComputerAsset, ComputerAssetResponse } from "@mrgnlabs/mrgn-utils";

interface TokenStore {
  // State
  computerAssets: ComputerAsset[];
  computerAssetIdMap: Record<string, ComputerAsset>;
  computerAssetAddressMap: Record<string, ComputerAsset>;

  // Actions
  getComputerAssets: () => Promise<void>;
}

const initTokenState = {
  computerAssets: [],
  computerAssetIdMap: {},
  computerAssetAddressMap: {},
};

const client = initComputerClient();

type TokenStorePersist = (
  config: StateCreator<TokenStore>,
  options: PersistOptions<TokenStore>
) => StateCreator<TokenStore>;

const createTokenStore = () => {
  return create<TokenStore>()(
    (persist as TokenStorePersist)(
      (set: (state: Partial<TokenStore>) => void, get: () => TokenStore) => ({
        // State
        ...initTokenState,

        // Actions
        getComputerAssets: async () => {
          const { getMixinClient } = useAppStore.getState();
          const assets = await client.fetchAssets();
          assets.push({
            asset_id: "64692c23-8971-4cf4-84a7-4dd1271dd887",
            address: "So11111111111111111111111111111111111111112",
            uri: "https://mixin-images.zeromesh.net/eTzm8_cWke8NqJ3zbQcx7RkvbcTytD_NgBpdwIAgKJRpOoo0S0AQ3IQ-YeBJgUKmpsMPUHcZFzfuWowv3801cF5HXfya5MQ9fTA9HQ=s128",
            decimals: 9,
          });
          const { computerAssets: current } = get();

          if (assets.length > current.length) {
            const ids = assets.map((a: ComputerAssetResponse) => a.asset_id);
            const mp = assets.reduce<Record<string, number>>((prev, cur, index) => {
              prev[cur.asset_id] = index;
              return prev;
            }, {});

            const mixinClient = getMixinClient();
            const mas = await mixinClient.safe.fetchAssets(ids);
            const fas = mas.map((a: any) => ({
              ...assets[mp[a.asset_id]],
              asset: a,
            }));

            const addressMap = fas.reduce<Record<string, ComputerAsset>>((prev, cur) => {
              prev[cur.address] = cur;
              return prev;
            }, {});

            const idMap = fas.reduce<Record<string, ComputerAsset>>((prev, cur) => {
              prev[cur.asset_id] = cur;
              return prev;
            }, {});

            set({
              computerAssets: fas,
              computerAssetAddressMap: addressMap,
              computerAssetIdMap: idMap,
            });
          }
        },
      }),
      {
        name: "tokenStore",
      }
    )
  );
};

export { createTokenStore };
export type { TokenStore };
