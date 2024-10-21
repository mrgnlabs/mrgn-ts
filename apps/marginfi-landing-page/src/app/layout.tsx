import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
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
            <GoogleTagManager gtmId="GTM-53CZ2GG8" />
            <Script
              id="hotjar-script"
              dangerouslySetInnerHTML={{
                __html: `(function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:5178229,hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`,
              }}
            />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
