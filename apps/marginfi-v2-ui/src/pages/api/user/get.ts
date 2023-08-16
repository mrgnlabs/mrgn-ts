import { NextApiResponse } from "next";
import {
  NextApiRequest,
  STATUS_INTERNAL_ERROR,
  STATUS_NOT_FOUND,
  STATUS_OK,
  getFirebaseUserByWallet,
  initFirebaseIfNeeded,
} from "./utils";
import { UserData } from "~/api/firebase";

initFirebaseIfNeeded();

export interface UserGetRequest {
  wallet: string;
}

export type UserGetResponse =
  | {
      user: UserData;
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
    return res.status(STATUS_INTERNAL_ERROR).json({ error: error.message }); // An unexpected error occurred
  }
}
