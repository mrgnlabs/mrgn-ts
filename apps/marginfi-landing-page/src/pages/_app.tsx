import React, { useEffect } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { init, push } from "@socialgouv/matomo-next";
import { Footer, Navbar } from "~/components";
import "react-toastify/dist/ReactToastify.min.css";

// Use require instead of import since order matters
require("@solana/wallet-adapter-react-ui/styles.css");
require("~/styles/globals.css");

// Matomo
const MATOMO_URL = "https://mrgn.matomo.cloud";

const MyApp = ({ Component, pageProps }: AppProps) => {
  // enable matomo heartbeat
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT === "alpha") {
      init({ url: MATOMO_URL, siteId: "1" });
      // accurately measure the time spent in the visit
      push(["enableHeartBeatTimer"]);
    }
  }, []);

  return (
    <>
      <Head>
        <title>marginfi</title>
        <meta name="description" content="marginfi v2 UI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Navbar />
      <div className="w-full min-h-[100vh] flex flex-col justify-center items-start ml-10 md:ml-24 2xl:ml-48">
        <Component {...pageProps} />
      </div>
      <Footer />
    </>
  );
};

export default MyApp;
