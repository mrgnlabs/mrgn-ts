import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <Script
          data-project-id="97CJsmFvWji6khP1F3Qa409ZryBNxEsiwpa8pKLM"
          src="https://snippet.meticulous.ai/v1/meticulous.js"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/mrgn_logo_rounded.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <body className="no-scrollbar">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
