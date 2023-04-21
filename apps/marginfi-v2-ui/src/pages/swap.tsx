import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import config from "~/config";
import { PageHeader } from "~/components/PageHeader";

const JupiterPage = () => {
    const { wallet } = useWallet();
  
    useEffect(() => {
      initJupiter();
    }, [wallet]);

    console.log({
      endpoint: config.rpcEndpoint
    })
  
    const initJupiter = () => {
      if (wallet) {
        // @ts-ignore
        window.Jupiter.init({
          displayMode: "integrated",
          integratedTargetId: "integrated-terminal",
          endpoint: config.rpcEndpoint,
          passThroughWallet: wallet,
        });
      }
    };
  
    return (
      <>
        <PageHeader />
        {/* <div className="flex justify-center items-start h-screen w-full pt-5"> */}
        <div className="w-full h-full flex flex-col justify-start content-start py-[64px] gap-4 w-4/5 max-w-[350px]">
          <div id="integrated-terminal"></div>
        </div>
      </>
      
    );
  };
  
export default JupiterPage;
