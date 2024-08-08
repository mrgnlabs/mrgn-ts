import { NextApiResponse } from "next";
import { initFirebaseIfNeeded, getReferralCode } from "../utils";
import { NextApiRequest } from "../../utils";
import { STATUS_INTERNAL_ERROR, STATUS_NOT_FOUND, STATUS_BAD_REQUEST, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

initFirebaseIfNeeded();

export type GetCodeRequest = {
  wallet: string;
};

export type GetCodeResponse =
  | {
      wallet: string;
      referralCode: string;
    }
  | {
      error: string;
    };

export default async function handler(req: NextApiRequest<GetCodeRequest>, res: NextApiResponse<GetCodeResponse>) {
  const { wallet } = req.body;

  if (!wallet) {
    return res.status(STATUS_BAD_REQUEST).json({ error: "Wallet is required" });
  }

  try {
    const code = await getReferralCode(wallet);
    if (!code) {
      return res.status(STATUS_NOT_FOUND).json({ error: "Referral code not found" });
    }
    return res.status(STATUS_OK).json({ wallet, referralCode: code });
  } catch (error: any) {
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message }); // An unexpected error occurre
  }
}
