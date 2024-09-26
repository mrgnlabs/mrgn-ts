import { LipClientProvider } from "~/context";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { CampaignWizard } from "~/components/desktop/CampaignWizard";

export default function LIP() {
  const { connected } = useWallet();

  return (
    <>
      <LipClientProvider>{connected && <CampaignWizard />}</LipClientProvider>
    </>
  );
}
