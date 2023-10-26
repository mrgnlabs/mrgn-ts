import React, { useEffect, useState } from "react";
// import "react-native-get-random-values";
import { Buffer } from "buffer";
import { registerRootComponent } from "expo";
import { JupiterProvider } from "@jup-ag/react-hook";
import { RecoilRoot, useSetRecoilState } from "recoil";
import { ActivityIndicator, View, Text, StyleSheet, ImageBackground, Pressable } from "react-native";
import Toast from "react-native-toast-message";

import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { BottomTabHeaderProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFonts, Inter_900Black } from "@expo-google-fonts/dev";

import { SwapContextProvider } from "~/context";
import { useConnection } from "~/context/ConnectionContext";
import { ORDERED_MOBILE_NAVBAR_LINKS, ROUTE_CACHE_DURATION, isSideDrawerVisible } from "~/consts";
import { MrgnIcon } from "~/assets/icons";
import tw from "~/styles/tailwind";
import { DrawerMenu } from "~/components/Common/DrawerMenu";
import { useXNftPublicKey, useXnftReady } from "~/hooks/xnftHooks";
import { useIsMobile } from "~/hooks/useIsMobile";
import { ConnectionProvider } from "~/context/ConnectionContext";
import { XNftWalletProvider, useWallet } from "~/context/WalletContext";
import { useIsWindowLoaded } from "~/hooks/useIsWindowLoaded";
import { RPC_ENDPOINT_OVERRIDE } from "@env";

global.Buffer = Buffer;
require("~/styles/globals.css");
require("~/styles/fonts.css");

const Tab = createBottomTabNavigator();

const MyTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0e1213",
  },
};

function LogoTitle({ title }: { title: string }) {
  const styles = StyleSheet.create({
    container: {
      borderBottomColor: "rgb(39, 39, 41)",
      borderBottomWidth: 1,
      height: 63,
      position: "relative",
    },
    backgroundImage: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      height: "100%",
      paddingLeft: 22,
      gap: 10,
    },

    headerTitle: {
      height: "auto",
      fontFamily: "Aeonik Pro",
      fontWeight: "400",
      color: "white",
      fontSize: 24,
      marginVertical: "auto",
    },
  });

  return (
    <View style={styles.container}>
      <ImageBackground style={styles.backgroundImage} source={{ uri: "https://app.marginfi.com/WaveBG3.png" }}>
        <MrgnIcon width={22} height={22} />
        <Text style={styles.headerTitle}>{title}</Text>
      </ImageBackground>
    </View>
  );
}

function TabNavigator() {
  const setIsMenuVisible = useSetRecoilState(isSideDrawerVisible);

  return (
    <Tab.Navigator
      initialRouteName="Lend"
      screenOptions={{
        tabBarActiveTintColor: "#DCE85D",
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: { fontWeight: "400", fontSize: 14, flex: 1, fontFamily: "Aeonik Pro" },
        tabBarStyle: { height: 70, paddingTop: 13, paddingBottom: 10 },
      }}
    >
      {ORDERED_MOBILE_NAVBAR_LINKS.map((navBarLink) => {
        const LinkIcon = navBarLink.Icon;
        return navBarLink.label === "more" ? (
          <Tab.Screen
            key={navBarLink.label}
            name={navBarLink.name}
            component={navBarLink.Comp as any}
            options={{
              tabBarShowLabel: false,
              tabBarIcon: ({ color }) => <navBarLink.Icon color={color} height={20} width={20} />,
              tabBarButton: () => (
                <Pressable
                  style={tw`flex flex-1 flex-column items-center`}
                  onPress={() => {
                    setIsMenuVisible(true);
                  }}
                >
                  <View style={tw`flex-1 items-stretch`}>
                    <View style={tw`self-center w-full h-full justify-center items-center absolute`}>
                      <LinkIcon color="#7c7c7d" height={20} width={20} />
                    </View>
                  </View>
                  <Text style={tw`font-normal text-sm flex flex-1 text-[#7c7c7d] leading-none`}>{navBarLink.name}</Text>
                </Pressable>
              ),
            }}
          />
        ) : (
          <Tab.Screen
            key={navBarLink.label}
            name={navBarLink.name}
            component={navBarLink.Comp as any}
            options={{
              tabBarItemStyle: navBarLink.isExtra ? { display: "none" } : {},
              header: (props: BottomTabHeaderProps) => <LogoTitle title={navBarLink.label} />,
              tabBarLabel: navBarLink.label,
              tabBarIcon: ({ color }) => <LinkIcon color={color} height={20} width={20} />,
            }}
          />
        );
      })}
    </Tab.Navigator>
  );
}

function App() {
  let [fontsLoaded] = useFonts({
    Inter_900Black,
  });
  const isMobile = useIsMobile();
  const { connection } = useConnection();
  const { wallet } = useWallet();
  const publicKey = useXNftPublicKey(); // temp
  const didLaunch = useXnftReady();
  const isWindowLoaded = useIsWindowLoaded();

  const [asLegacyTransaction, setAsLegacyTransaction] = useState(false);

  if (!fontsLoaded || isMobile === undefined || (!didLaunch && !isMobile) || !isWindowLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <RecoilRoot>
      <XNftWalletProvider>
        <ConnectionProvider
          endpoint={RPC_ENDPOINT_OVERRIDE} // add fallback endpoint
        >
          <JupiterProvider
            connection={connection}
            routeCacheDuration={ROUTE_CACHE_DURATION}
            wrapUnwrapSOL={true}
            userPublicKey={publicKey ?? undefined}
            platformFeeAndAccounts={undefined}
            asLegacyTransaction={asLegacyTransaction}
          >
            <SwapContextProvider
              asLegacyTransaction={asLegacyTransaction}
              setAsLegacyTransaction={setAsLegacyTransaction}
            >
              <NavigationContainer theme={MyTheme}>
                <DrawerMenu />
                <TabNavigator />
              </NavigationContainer>
              <Toast position={"bottom"} />
            </SwapContextProvider>
          </JupiterProvider>
        </ConnectionProvider>
      </XNftWalletProvider>
    </RecoilRoot>
  );
}

export default registerRootComponent(App);
