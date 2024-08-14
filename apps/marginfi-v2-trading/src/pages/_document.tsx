import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="darkreader" content="NO-DARKREADER-PLUGIN" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/mrgn_logo_rounded.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&display=swap" rel="stylesheet" />
      </Head>
      <body className="no-scrollbar">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
