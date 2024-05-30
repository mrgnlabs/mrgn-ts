import { NextApiResponse } from "next";
import { getLastUsedWallet, initFirebaseIfNeeded } from "./utils";
import { NextApiRequest } from "../utils";
import { STATUS_INTERNAL_ERROR, STATUS_NOT_FOUND, STATUS_OK, firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";

initFirebaseIfNeeded();

export type UserWalletRequest = {
  wallet: string;
};

export type UserWalletResponse =
  | {
      wallet: string;
    }
  | {
      error: string;
    };

export default async function handler(
  req: NextApiRequest<UserWalletRequest>,
  res: NextApiResponse<UserWalletResponse>
) {
  const { wallet } = req.query as { wallet: string };

  if (!wallet) {
    return res.status(STATUS_NOT_FOUND).json({ error: "Wallet address is required" });
  }

  try {
    const userWallet = await getLastUsedWallet(wallet);
    if (!userWallet) {
      return res.status(STATUS_NOT_FOUND).json({ error: "User not found" });
    }
    return res.status(STATUS_OK).json({ wallet: userWallet });
  } catch (error: any) {
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message }); // An unexpected error occurre
  }
}
