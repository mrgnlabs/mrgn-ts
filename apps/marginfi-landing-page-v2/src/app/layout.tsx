import { Inter as FontSans } from "next/font/google";

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
      </body>
    </html>
  );
}
