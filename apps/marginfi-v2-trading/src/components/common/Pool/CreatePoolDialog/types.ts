import { z } from "zod";

export enum CreatePoolState {
  SEARCH = "initial",
  MINT = "mint",
  FORM = "form",
  SUCCESS = "success",
  ERROR = "error",
}

export const formSchema = z
  .object({
    mint: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.string().refine((value) => !isNaN(Number(value)), {
      message: "Decimals must be a number",
    }),
    oracle: z.string(),
    imageUpload: typeof window !== "undefined" ? z.instanceof(File).optional() : z.any().optional(),
    imageDownload: z.string().optional(),
  })
  .refine((data) => data.imageUpload || data.imageDownload, {
    message: "Token image must be provided",
    path: ["imageUpload", "imageDownload"],
  });

export type FormValues = z.infer<typeof formSchema>;
