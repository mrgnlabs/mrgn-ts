import { registerRootComponent } from "expo";
import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { Navbar } from './components/Navbar';

// Import global styles
import "../../omni/src/styles/globals.css";


const App = () => {
  const [loaded, setLoaded] = useState<boolean>(false);
  const [walletPublicKey, setWalletPublicKey] = useState<string | null >("");

  useEffect(() => {
    // @ts-ignore
    if ( window?.xnft?.solana?.publicKey?.toBase58() ) {
      setLoaded(true);
      setWalletPublicKey(
        // @ts-ignore
        window?.xnft?.solana?.publicKey?.toBase58()
      );
    }
  }, [
    // @ts-ignore
    window.xnft,
    // @ts-ignore
    window.xnft.solana,
    // @ts-ignore
    window.xnft.solana.publicKey,
  ])

  return (
    <View>
      <Navbar />
    </View>
  )
}

export default registerRootComponent(App);
