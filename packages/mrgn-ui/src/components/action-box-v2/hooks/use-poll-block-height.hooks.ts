import { useState, useEffect } from "react";
import { Connection } from "@solana/web3.js";

export const usePollBlockHeight = (connection?: Connection, lastValidBlockHeight?: number) => {
  const [isRefreshTxn, setIsRefreshTxn] = useState(false);
  const [blockProgress, setBlockProgress] = useState(0);
  const blockHeightSpace = 300;

  useEffect(() => {
    if (!lastValidBlockHeight || !connection) {
      setIsRefreshTxn(false);
      return;
    }

    let intervalId: any;

    const pollBlockHeight = async () => {
      try {
        const currentBlockHeight = await connection.getBlockHeight("confirmed");
        const blockHeightProgress = 1 - (lastValidBlockHeight - currentBlockHeight) / blockHeightSpace;
        setBlockProgress(blockHeightProgress);

        if (currentBlockHeight > lastValidBlockHeight) {
          clearInterval(intervalId);
          setBlockProgress(0);
          setIsRefreshTxn(true);
        } else {
          setBlockProgress(blockHeightProgress);
          setIsRefreshTxn(false);
        }
      } catch (error) {
        console.error("Error polling block height:", error);
      }
    };

    intervalId = setInterval(pollBlockHeight, 3000) as any; // Poll every second

    return () => {
      clearInterval(intervalId);
    };
  }, [lastValidBlockHeight, connection]);

  return { blockProgress, isRefreshTxn };
};
