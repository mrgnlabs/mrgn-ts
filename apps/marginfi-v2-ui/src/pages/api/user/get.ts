import { NextApiResponse } from "next";
import { getFirebaseUserByWallet, initFirebaseIfNeeded } from "./utils";
import { NextApiRequest } from "../utils";
import { STATUS_INTERNAL_ERROR, STATUS_NOT_FOUND, STATUS_OK, firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";

initFirebaseIfNeeded();

export interface UserGetRequest {
  wallet: string;
}

export type UserGetResponse =
  | {
      user: firebaseApi.UserData;
    }
  | {
      error: string;
    };

export default async function handler(req: NextApiRequest<UserGetRequest>, res: NextApiResponse<UserGetResponse>) {
  const { wallet } = req.body;

  try {
    const userResult = await getFirebaseUserByWallet(wallet);
    if (!userResult) {
      return res.status(STATUS_NOT_FOUND).json({ error: "User not found" });
    }
    return res.status(STATUS_OK).json({ user: { id: userResult.uid } });
  } catch (error: any) {
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message }); // An unexpected error occurre
  }
}
