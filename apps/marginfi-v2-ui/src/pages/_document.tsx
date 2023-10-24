import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            data-project-id="97CJsmFvWji6khP1F3Qa409ZryBNxEsiwpa8pKLM"
            src="https://snippet.meticulous.ai/v1/meticulous.js"
          />
        }
      </Head>
      <body className="no-scrollbar dark">
        <Main />
        <NextScript />
        <script defer src="https://terminal.jup.ag/main-v1.js" data-preload />
      </body>
    </Html>
  );
}
