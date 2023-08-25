import { useWallet } from "@solana/wallet-adapter-react";
import { PageHeader } from "~/components/PageHeader";
import { CampaignWizard } from "~/components/CampaignWizard";
import { LipClientProvider } from "~/context";

const LIP = () => {
  const wallet = useWallet();

  return (
    <LipClientProvider>
      <PageHeader />
      {wallet.connected && <CampaignWizard />}
    </LipClientProvider>
  );
};

export default LIP;
