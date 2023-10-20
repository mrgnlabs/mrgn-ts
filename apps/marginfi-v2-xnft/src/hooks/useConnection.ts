import { useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";

export function useConnection() {
  const [connection, setConnection] = useState<Connection>();

  useEffect(() => {
    if (!connection && window?.xnft?.solana) {
      const endpoint = window.xnft.solana.connection._rpcEndpoint as string;
      setConnection(new Connection(endpoint));
    }
  }, [connection]);
  return connection;
}
