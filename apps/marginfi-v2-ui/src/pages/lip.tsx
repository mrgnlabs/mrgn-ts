import { PageHeader } from "~/components/desktop/PageHeader";
import { CampaignWizard } from "~/components/desktop/CampaignWizard";
import { LipClientProvider } from "~/context";
import { useWalletContext } from "~/components/common/useWalletContext";

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
