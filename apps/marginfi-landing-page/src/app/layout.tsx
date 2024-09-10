import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";

import { Header } from "~/components/header";

import type { Metadata } from "next";

import "../styles/fonts.css";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "marginfi",
  description: "a new liquidity layer for performant defi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        {process.env.NEXT_PUBLIC_ANALYTICS === "true" && (
          <>
            <GoogleAnalytics gaId="G-TS0DF3DM7G" />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
