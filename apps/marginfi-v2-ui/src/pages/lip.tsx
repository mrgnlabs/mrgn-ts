import { PageHeader } from "~/components/PageHeader";
import { CampaignWizard } from "~/components/CampaignWizard";
import { LipClientProvider } from "~/context";
import { useWalletContext } from "~/components/useWalletContext";

const LIP = () => {
  const { connected } = useWalletContext();

  return (
    <LipClientProvider>
      <PageHeader />
      {connected && <CampaignWizard />}
    </LipClientProvider>
  );
};

export default LIP;
