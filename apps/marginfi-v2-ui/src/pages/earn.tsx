import dynamic from "next/dynamic";

import { LipClientProvider } from "~/context";
import { PageHeader } from "~/components/common/PageHeader";

const Earn = dynamic(async () => (await import("~/components/desktop/Earn")).Earn, { ssr: false });

const EarnPage = () => {
  return (
    <LipClientProvider>
      <PageHeader>earn</PageHeader>
      <Earn />
    </LipClientProvider>
  );
};

export default EarnPage;
