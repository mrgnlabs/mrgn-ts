import { NextApiResponse } from "next";
import { initFirebaseIfNeeded, trackReferral } from "../utils";
import { NextApiRequest } from "../../utils";
import { STATUS_INTERNAL_ERROR, STATUS_NOT_FOUND, STATUS_BAD_REQUEST, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

initFirebaseIfNeeded();

export type GetCodeRequest = {
  wallet: string;
  referralCode: string;
};

export type GetCodeResponse =
  | {
      wallet: string;
      referralTracked: boolean;
    }
  | {
      error: string;
    };

export default async function handler(req: NextApiRequest<GetCodeRequest>, res: NextApiResponse<GetCodeResponse>) {
  const { wallet, referralCode } = req.body;

  console.log("track-referral", wallet, referralCode);

  if (!wallet || !referralCode) {
    return res.status(STATUS_BAD_REQUEST).json({ error: "Invalid request" });
  }

  try {
    const code = await trackReferral(wallet, referralCode);
    if (!code) {
      return res.status(STATUS_OK).json({ error: "Referral not tracked" });
    }
    return res.status(STATUS_OK).json({ wallet, referralTracked: true });
  } catch (error: any) {
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message }); // An unexpected error occurre
  }
}
