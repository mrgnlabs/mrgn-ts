import { Header } from "../../header";

import type { Metadata } from "next";

import "../styles/fonts.css";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "marginfi trading ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
