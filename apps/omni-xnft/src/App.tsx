import { registerRootComponent } from "expo";
import { RecoilRoot } from "recoil";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  BanksStateProvider,
  ProgramProvider,
  TokenAccountsProvider,
  TokenMetadataProvider,
  UserAccountsProvider,
  JupiterApiProvider,
  XnftProviderProvider,
} from "~context";
import { HomePage } from "./pages/HomePage";

function TabNavigator() {
  return <HomePage />;
}

function App() {
  if (false) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <XnftProviderProvider>
      <ProgramProvider>
        <TokenMetadataProvider>
          <BanksStateProvider>
            <TokenAccountsProvider>
              <UserAccountsProvider>
                <JupiterApiProvider>
                  <RecoilRoot>
                    <NavigationContainer>
                      <TabNavigator />
                    </NavigationContainer>
                  </RecoilRoot>
                </JupiterApiProvider>
              </UserAccountsProvider>
            </TokenAccountsProvider>
          </BanksStateProvider>
        </TokenMetadataProvider>
      </ProgramProvider>
    </XnftProviderProvider>
  );
}

export default registerRootComponent(App);
