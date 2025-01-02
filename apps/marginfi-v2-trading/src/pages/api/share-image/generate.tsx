/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

import { DynamicShareImage } from "~/components/common/dynamic-share-image";

export const runtime = "edge";

// Generate link preview image
// Note that a lot of usual CSS is unsupported, including tailwind.
export default async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenSymbol = searchParams.get("tokenSymbol");
  const tokenImageUrl = searchParams.get("tokenImageUrl");
  return new ImageResponse(
    (
      // <DynamicShareImage
      //   tokenImageUrl="https://storage.googleapis.com/mrgn-public/mrgn-token-icons/CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump.png"
      //   quoteImageUrl="https://storage.googleapis.com/mrgn-public/mrgn-token-icons/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png"
      //   tokenSymbol="GOAT"
      //   quoteSymbol="LST"
      // />
      <DynamicShareImage tokenSymbol={tokenSymbol} tokenImageUrl={tokenImageUrl} />
    ),
    {
      width: 960, // TODO: figure out sizing
      height: 500,
    }
  );
}
