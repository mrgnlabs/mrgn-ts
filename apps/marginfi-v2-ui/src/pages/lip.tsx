import { useWallet } from "@solana/wallet-adapter-react";
import { PageHeader } from "~/components/PageHeader";
import { CampaignWizard } from "~/components/CampaignWizard";

const LIP = () => {
    const wallet = useWallet();

    return (
        <>
            <PageHeader />
            {
                wallet.connected &&
                <CampaignWizard />
            }
        </>
    )
}

export default LIP;
