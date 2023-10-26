import { Connection, PublicKey } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import { AnchorProvider, Provider, Wallet } from "@coral-xyz/anchor";

import { XnftWallet } from "~/types/xnftTypes";
import { useIsMobile } from "./useIsMobile";

// Hooks do not work due to useDidLaunch, TODO futher look into it
declare global {
  interface Window {
    xnft: any;
  }
}

export const useXnftReady = useXnftDidLaunch;
export const useXNftConnection = useSolanaConnection;
export const useXNftWallet = useWallet;
export const useXNftPublicKey = usePublicKey;

// export function useProvider(): Provider | undefined {
//    const {didLaunch} = useXnftDidLaunch();
//   const connection = useSolanaConnection();
//   const wallet = useWallet();
//   const [provider, setProvider] = useState<Provider>();
//   useEffect(() => {
//     if (didLaunch && connection && wallet) {
//       window.xnft.solana.on("publicKeyUpdate", () => {
//         setProvider(new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions()));
//       });
//       setProvider(new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions()));
//     }
//   }, [didLaunch, setProvider, connection, wallet]);
//   return provider;
// }

function useWallet(): XnftWallet | undefined {
  const didLaunch = useXnftDidLaunch();
  const [wallet, setWallet] = useState<XnftWallet>();
  useEffect(() => {
    if (didLaunch) {
      window.xnft.solana.on("publicKeyUpdate", () => {
        setWallet(new XnftWallet(window.xnft.solana));
      });
      setWallet(new XnftWallet(window.xnft.solana));
    }
  }, [didLaunch, setWallet]);
  return wallet;
}

/** @deprecated use `usePublicKeys()` instead */
function usePublicKey(): PublicKey | null {
  const didLaunch = useXnftDidLaunch();
  const [publicKey, setPublicKey] = useState(null);
  useEffect(() => {
    if (didLaunch) {
      window.xnft.solana.on("publicKeyUpdate", () => {
        setPublicKey(window.xnft.solana.publicKey);
      });
      setPublicKey(window.xnft.solana.publicKey);
    }
  }, [didLaunch, setPublicKey]);
  return publicKey;
}

function usePublicKeys(): { [key: string]: PublicKey } | undefined {
  const didLaunch = useXnftDidLaunch();

  const [publicKeys, setPublicKeys] = useState();
  useEffect(() => {
    if (didLaunch) {
      window.xnft.on("publicKeysUpdate", () => {
        setPublicKeys(window.xnft.publicKeys);
      });
      setPublicKeys(window.xnft.publicKeys);
    }
  }, [didLaunch, setPublicKeys]);
  return publicKeys;
}

/** @deprecated use blockchain-specific connections instead */
function useConnection(): Connection | undefined {
  const didLaunch = useXnftDidLaunch();
  const [connection, setConnection] = useState();
  useEffect(() => {
    if (didLaunch) {
      window.xnft.solana.on("connectionUpdate", () => {
        setConnection(window.xnft.solana.connection);
      });
      setConnection(window.xnft.solana.connection);
    }
  }, [didLaunch, setConnection]);
  return connection;
}

function useSolanaConnection(): Connection | undefined {
  const didLaunch = useXnftDidLaunch();
  const [connection, setConnection] = useState<Connection>();
  useEffect(() => {
    if (didLaunch) {
      const xNftConnection = new Connection(window.xnft.solana.connection.rpcEndpoint, { commitment: "confirmed" });
      window.xnft.solana.on("connectionUpdate", () => {
        setConnection(xNftConnection);
      });
      setConnection(xNftConnection);
    }
  }, [didLaunch, setConnection]);
  return connection;
}

// function useEthereumConnection(): Connection | undefined {
//   const didLaunch = useXnftDidLaunch();
//   const [connection, setConnection] = useState();
//   useEffect(() => {
//     if (didLaunch) {
//       window.xnft.ethereum?.on("connectionUpdate", () => {
//         setConnection(window.xnft.ethereum.connection);
//       });
//       setConnection(window.xnft.ethereum.connection);
//     }
//   }, [didLaunch, setConnection]);
//   return connection;
// }

// Returns true if the `window.xnft` object is ready to be used.
// function useXnftDidLaunch() {
//   const [didLaunch, setDidLaunch] = useState(false);

//   useEffect(() => {
//     window.addEventListener("load", () => {
//       console.log("didConnect");
//       window.xnft.on("connect", () => {
//         setDidLaunch(true);
//         console.log("true");
//       });
//       window.xnft.on("disconnect", () => {
//         setDidLaunch(false);
//         console.log("false");
//       });
//     });
//   }, []);
//   return didLaunch;
// }

function useXnftDidLaunch() {
  const isMobile = useIsMobile();

  const nftDidLaunch = useMemo(() => {
    if (isMobile === false) {
      return true;
    } else {
      return false;
    }
  }, [isMobile]);
  return nftDidLaunch;
}

// export function useMetadata(): XnftMetadata | undefined {
//   const didLaunch = useDidLaunch();
//   const [metadata, setMetadata] = useState();

//   useEffect(() => {
//     if (didLaunch) {
//       setMetadata(window.xnft.metadata);
//       window.xnft.addListener("metadata", (event: Event) => {
//         setMetadata(event.data.metadata);
//       });
//     }
//   }, [didLaunch, setMetadata]);
//   return metadata;
// }

function useDimensions(debounceMs = 0) {
  const [dimensions, setDimensions] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });

  const debounce = (fn: Function) => {
    let timer: ReturnType<typeof setTimeout>;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(() => {
        clearTimeout(timer);
        // @ts-ignore
        fn.apply(this, arguments);
      }, debounceMs);
    };
  };

  useEffect(() => {
    setDimensions({
      height: window.innerHeight,
      width: window.innerWidth,
    });

    const debouncedHandleResize = debounce(function handleResize() {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    });

    window.addEventListener("resize", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, []);

  return dimensions;
}
