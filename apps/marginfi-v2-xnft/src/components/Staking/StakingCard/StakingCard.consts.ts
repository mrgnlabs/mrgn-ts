import BN from "bn.js";
import { DepositOption } from "./StakingCard.utils";

export const SOL_LOGO_URL =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

export const QUOTE_EXPIRY_MS = 30_000;
export const DEFAULT_DEPOSIT_OPTION: DepositOption = { type: "native", amount: new BN(0), maxAmount: new BN(0) };
