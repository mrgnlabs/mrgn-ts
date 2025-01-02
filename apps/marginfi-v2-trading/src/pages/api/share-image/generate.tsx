/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

import { DynamicShareImage } from "~/components/common/dynamic-share-image";

export const runtime = "edge";

// Generate link preview image
// Note that a lot of usual CSS is unsupported, including tailwind.
export default async function GET(request: NextRequest) {
  const baseUrl = `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("host")}`;

  const { searchParams } = new URL(request.url);
  const tokenSymbol = searchParams.get("tokenSymbol");
  const tokenImageUrl = searchParams.get("tokenImageUrl");
  const quoteTokenSymbol = searchParams.get("quoteTokenSymbol");
  const quoteTokenImageUrl = searchParams.get("quoteTokenImageUrl");

  return new ImageResponse(
    (
      <DynamicShareImage
        tokenImageUrl={tokenImageUrl ?? ""}
        quoteTokenImageUrl={quoteTokenImageUrl ?? ""}
        tokenSymbol={tokenSymbol ?? ""}
        quoteTokenSymbol={quoteTokenSymbol ?? ""}
        baseUrl={baseUrl ?? ""}
      />
    ),
    {
      width: 720,
      height: 360,
    }
  );
}
