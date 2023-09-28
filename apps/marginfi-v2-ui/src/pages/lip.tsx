import { PageHeader } from "~/components/desktop/PageHeader";
import { CampaignWizard } from "~/components/desktop/CampaignWizard";
import { LipClientProvider } from "~/context";
import { useWalletContext } from "~/hooks/useWalletContext";

const LIP = () => {
  const { connected } = useWalletContext();

  return (
    <LipClientProvider>
      <PageHeader>lip</PageHeader>
      {connected && <CampaignWizard />}
    </LipClientProvider>
  );
};

export default LIP;
