import { useState, useEffect } from "react";
import { Connection, VersionedTransaction } from "@solana/web3.js";

export const usePollBlockHeight = (connection?: Connection, lastValidBlockHeight?: number) => {
  const [isRefreshTxn, setIsRefreshTxn] = useState(false);

  useEffect(() => {
    if (!lastValidBlockHeight || !connection) {
      setIsRefreshTxn(false);
      return;
    }

    let intervalId: number;

    const pollBlockHeight = async () => {
      try {
        const currentBlockHeight = await connection.getBlockHeight("confirmed");

        if (currentBlockHeight > lastValidBlockHeight) {
          clearInterval(intervalId);
          setIsRefreshTxn(true);
        } else {
          setIsRefreshTxn(false);
        }
      } catch (error) {
        console.error("Error polling block height:", error);
        clearInterval(intervalId);
      }
    };

    intervalId = setInterval(pollBlockHeight, 1000); // Poll every second

    return () => {
      clearInterval(intervalId);
    };
  }, [lastValidBlockHeight, connection]);

  return { isRefreshTxn };
};
