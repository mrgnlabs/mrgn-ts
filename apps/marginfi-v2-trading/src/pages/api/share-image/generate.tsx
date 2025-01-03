/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

import { DynamicShareImage } from "~/components/common/dynamic-share-image";

export const runtime = "edge";

async function loadFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}:wght@700&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);

  if (resource) {
    const response = await fetch(resource[1]);
    if (response.ok) {
      return await response.arrayBuffer();
    }
  }

  throw new Error(`Failed to load font data for ${font}`);
}
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
      fonts: [
        {
          name: "Orbitron",
          data: await loadFont("Orbitron", `${tokenSymbol}/${quoteTokenSymbol}`),
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}
