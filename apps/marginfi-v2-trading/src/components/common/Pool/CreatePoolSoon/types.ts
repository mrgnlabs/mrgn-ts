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

export const formSchema = z.object({
  mint: z
    .string({
      required_error: "You need to enter a valid token mint.",
    })
    .superRefine(async (val, ctx) => {
      const isValid = verifyPublickey(val);

      if (!isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Publickey isn't valid.`,
        });
        return;
      }
    }),
  email: z
    .string({
      required_error: "Invalid email address.",
    })
    .email({ message: "Invalid email address." })
    .min(5),
  twitter: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;
