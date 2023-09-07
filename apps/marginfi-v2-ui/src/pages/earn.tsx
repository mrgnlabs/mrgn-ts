import dynamic from "next/dynamic";
import React from "react";
import { LipClientProvider } from "~/context";

const Earn = dynamic(async () => (await import("~/components/desktop/Earn")).Earn, { ssr: false });

const EarnPage = () => {
  return (
    <LipClientProvider>
      <Earn />
    </LipClientProvider>
  );
};

export default EarnPage;
