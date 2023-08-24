import React from "react";
import { registerRootComponent } from "expo";
import { RecoilRoot } from "recoil";
import { ActivityIndicator, View, Text, StyleSheet, ImageBackground } from "react-native";
import Toast from "react-native-toast-message";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { BottomTabHeaderProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts, Inter_900Black } from "@expo-google-fonts/dev";
import { PortfolioScreens } from "~/screens/PortfolioScreen";
import { LendScreen } from "~/screens/LendScreen";
// import { SwapScreen } from "~/screens/SwapScreen";

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

function LogoTitle() {
  const styles = StyleSheet.create({
    container: {
      // flex: '1 1 0%',
      borderBottomColor: "rgb(39, 39, 41)",
      borderBottomWidth: 1,
      height: "63px",
      position: "relative",

      // border-bottom-width: 1px
      // background-color: rgb(18, 18, 18)
      // border-bottom-color: rgb(39, 39, 41)
      // box-shadow: rgb(39, 39, 41) 0px 0px 0px
    },
    backgroundImage: {
      height: "100%",
    },

    headerTitle: {
      height: "auto",
      fontFamily: "Aeonik Pro",
      fontWeight: "400",
      color: "white",
      fontSize: 22,
      marginVertical: "auto",
      paddingLeft: "22px",
    },
  });

  return (
    <View style={styles.container}>
      <ImageBackground style={styles.backgroundImage} source={{ uri: "https://app.marginfi.com/WaveBG3.png" }}>
        <Text style={styles.headerTitle}>mrgnlend</Text>
      </ImageBackground>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: "#D8D8D8",
      }}
    >
      <Tab.Screen
        name="Lend"
        component={LendScreen}
        options={{
          header: (props: BottomTabHeaderProps) => <LogoTitle />,
          tabBarLabel: "Lend",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" color={color} size={size} />,
        }}
      />
      {/* <Tab.Screen
        name="Swap"
        component={SwapScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Swap",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bank" color={color} size={size} />
          ),
        }}
      /> */}
      <Tab.Screen
        name="Portfolio"
        component={PortfolioScreens}
        options={{
          header: (props: BottomTabHeaderProps) => <LogoTitle />,
          tabBarLabel: "Portfolio",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function App() {
  let [fontsLoaded] = useFonts({
    Inter_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <RecoilRoot>
      <NavigationContainer theme={MyTheme}>
        <TabNavigator />
      </NavigationContainer>
      <Toast position={"bottom"} />
    </RecoilRoot>
  );
}

export default registerRootComponent(App);
