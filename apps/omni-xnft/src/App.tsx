import { useEffect, useState, useMemo } from 'react';
import { registerRootComponent } from "expo";
import { SafeAreaView } from "react-native";
import { handlePromptSubmit } from "@mrgnlabs/omni-common";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";

import tw from './tw';

const Inner = () => {

  const wallet = useWallet();

  console.log({
    wallet, xnft: window.xnft
  })

  return (
    <SafeAreaView style={tw`h-full w-full`}>
    </SafeAreaView>
  )
  
}

const App = () => {

  useEffect(() => {
    console.log(window.backpack);
    console.log(window.xnft);
  }, [window, window.backpack, window.xnft])

  return (
    <WalletProvider wallets={[]} autoConnect>
      <Inner />
    </WalletProvider>
  );
}

export default registerRootComponent(App);
