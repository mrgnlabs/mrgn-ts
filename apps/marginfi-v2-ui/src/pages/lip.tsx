import { LipClientProvider } from "~/context";
import { useWalletContext } from "~/hooks/useWalletContext";
import { CampaignWizard } from "~/components/desktop/CampaignWizard";

export default function LIP() {
  const { connected } = useWalletContext();

  return (
    <>
      <LipClientProvider>{connected && <CampaignWizard />}</LipClientProvider>
    </>
  );
}
