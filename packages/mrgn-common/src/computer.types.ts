import { SafeUtxoOutput } from "@mixin.dev/mixin-node-sdk";

export interface ComputerInfoResponse {
  observer: string;
  payer: string;
  members: {
    app_id: string;
    members: string[];
    threshold: number;
  };
  params: {
    operation: {
      asset: string;
      price: string;
    };
  };
  height: number;
}

export interface ComputerUserResponse {
  id: string;
  mix_address: string;
  chain_address: string;
}

export interface ComputerAssetResponse {
  decimals?: number;
  asset_id: string;
  address: string;
  uri: string;
}

export interface ComputerAsset extends ComputerAssetResponse {
  asset: Asset;
}

export interface ComputerNonceResponse {
  nonce_address: string;
  nonce_hash: string;
}

export interface ComputerStorageResponse {
  hash: string;
}

export interface ComputerSystemCallRequest {
  trace: string;
  value: string;
}

export interface ComputerSystemCallResponse {
  id: string;
  user_id: string;
  nonce_account: string;
  raw: string;
  state: string;
  hash: string;
}

export interface Asset {
  asset_id: string;
  chain_id: string;
  asset_key: string;
  precision: number;
  name: string;
  symbol: string;
  price_usd: string;
  change_usd: string;
  icon_url: string;
}

export interface UserAssetBalanceWithoutAsset {
  asset_id: string;
  total_amount: string;
  outputs: SafeUtxoOutput[];
  address?: string;
}

export interface UserAssetBalance extends UserAssetBalanceWithoutAsset {
  asset: Asset;
}

export interface Token {
  balance: UserAssetBalance;
}

export interface ComputerFeeResponse {
  fee_id: string;
  xin_amount: string;
}
