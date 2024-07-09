import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

export enum CreatePoolState {
  SEARCH = "initial",
  MINT = "mint",
  FORM = "form",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export function verifyPublickey(key: string, allowPDA: boolean = false) {
  try {
    const _ = new PublicKey(key).toBytes();
  } catch (error) {
    return false;
  }

  if (!allowPDA && !PublicKey.isOnCurve(new PublicKey(key).toBytes())) {
    return false;
  }

  return true;
}

function superRefinePublickey(val: string, ctx: z.RefinementCtx) {}

export const formSchema = z
  .object({
    mint: z
      .string({
        required_error: "You need to enter a valid token mint.",
      })
      .superRefine(superRefinePublickey),
    name: z.string(),
    symbol: z.string(),
    decimals: z.string().refine((value) => !isNaN(Number(value)), {
      message: "Decimals must be a number",
    }),
    oracle: z
      .string({
        required_error: "You need to enter a valid oracle public key.",
      })
      .superRefine(superRefinePublickey),
    imageUpload: typeof window !== "undefined" ? z.instanceof(File).optional() : z.any().optional(),
    imageDownload: z.string().optional(),
  })
  .refine((data) => data.imageUpload || data.imageDownload, {
    message: "Token image must be provided",
    path: ["imageUpload", "imageDownload"],
  });

export type FormValues = z.infer<typeof formSchema>;
