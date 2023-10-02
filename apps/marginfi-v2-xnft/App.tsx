import React, { useState } from "react";
import { registerRootComponent } from "expo";
import { RecoilRoot } from "recoil";
import { ActivityIndicator, View, Text, StyleSheet, ImageBackground, TouchableOpacity } from "react-native";
import Toast from "react-native-toast-message";
import { JupiterProvider } from "@jup-ag/react-hook";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { BottomTabHeaderProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFonts, Inter_900Black } from "@expo-google-fonts/dev";

import { PortfolioScreens } from "~/screens/PortfolioScreen";
import { LendScreen } from "~/screens/LendScreen";
import { SwapScreen } from "~/screens/SwapScreen";
import { SwapContextProvider } from "~/context";
import { useConnection } from "~/hooks/useConnection";
import { useWallet } from "~/hooks/useWallet";
import { ROUTE_CACHE_DURATION } from "~/consts";
import { AppsIcon, PieChartIcon, ReceiveMoneyIcon, TokenSwapIcon } from "~/assets/icons";
import tw from "~/styles/tailwind";

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
        <Text style={styles.headerTitle}>{title}</Text>
      </ImageBackground>
    </View>
  );
}

function MoreScreen() {
  return null;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Lend"
      screenOptions={{
        tabBarActiveTintColor: "#DCE85D",
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: { fontWeight: "400", fontSize: 14, flex: 1, fontFamily: "Aeonik Pro" },
        tabBarStyle: { height: 60 },
      }}
    >
      {/* <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ color }) => <ReceiveMoneyIcon color={color} height={20} width={20} />,
          tabBarButton: () => (
            <TouchableOpacity
              style={tw`flex flex-1 flex-column items-center`}
              onPress={() => {
                console.log("working!");
              }}
            >
              <View style={tw`inline-flex flex-1 items-stretch`}>
                <View style={tw`self-center w-full h-full justify-center items-center inline-flex absolute`}>
                  <AppsIcon color="#7c7c7d" height={20} width={20} />
                </View>
              </View>
              <Text style={tw`font-normal text-sm flex flex-1 text-[#7c7c7d] leading-none`}>More</Text>
            </TouchableOpacity>
          ),
        }}
      /> */}

      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ color }) => <ReceiveMoneyIcon color={color} height={20} width={20} />,
          tabBarButton: () => (
            <TouchableOpacity
              style={tw`flex flex-1 flex-column items-center`}
              onPress={() => {
                console.log("working!");
              }}
            >
              <View style={tw`inline-flex flex-1 items-stretch`}>
                <View style={tw`self-center w-full h-full justify-center items-center inline-flex absolute`}>
                  <AppsIcon color="#7c7c7d" height={20} width={20} />
                </View>
              </View>
              <Text style={tw`font-normal text-sm flex flex-1 text-[#7c7c7d] leading-none`}>More</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="Lend"
        component={LendScreen}
        options={{
          header: (props: BottomTabHeaderProps) => <LogoTitle title="lend" />,
          tabBarLabel: "Lend",
          tabBarIcon: ({ color }) => <ReceiveMoneyIcon color={color} height={20} width={20} />,
        }}
      />
      <Tab.Screen
        name="Swap"
        component={SwapScreen}
        options={{
          header: (props: BottomTabHeaderProps) => <LogoTitle title="swap" />,
          tabBarLabel: "Swap",
          tabBarIcon: ({ color }) => <TokenSwapIcon color={color} height={20} width={20} />,
        }}
      />
      <Tab.Screen
        name="Portfolio"
        component={PortfolioScreens}
        options={{
          header: (props: BottomTabHeaderProps) => <LogoTitle title="portfolio" />,
          tabBarLabel: "Portfolio",
          tabBarIcon: ({ color }) => <PieChartIcon color={color} height={20} width={20} />,
        }}
      />
    </Tab.Navigator>
  );
}

function App() {
  let [fontsLoaded] = useFonts({
    Inter_900Black,
  });
  const connection = useConnection();
  const { publicKey } = useWallet();
  const [asLegacyTransaction, setAsLegacyTransaction] = useState(true);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <RecoilRoot>
      {connection && (
        <JupiterProvider
          connection={connection}
          routeCacheDuration={ROUTE_CACHE_DURATION}
          wrapUnwrapSOL={true}
          userPublicKey={publicKey || undefined}
          platformFeeAndAccounts={undefined}
          asLegacyTransaction={asLegacyTransaction}
        >
          <SwapContextProvider
            asLegacyTransaction={asLegacyTransaction}
            setAsLegacyTransaction={setAsLegacyTransaction}
          >
            <NavigationContainer theme={MyTheme}>
              <TabNavigator />
            </NavigationContainer>
            <Toast position={"bottom"} />
          </SwapContextProvider>
        </JupiterProvider>
      )}
    </RecoilRoot>
  );
}

export default registerRootComponent(App);
