import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import config from "~/config";

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
      <div className="flex justify-center items-start h-screen w-full pt-5">
        <div id="integrated-terminal"></div>
      </div>
    );
  };
  
export default JupiterPage;
