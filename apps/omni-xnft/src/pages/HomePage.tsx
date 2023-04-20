import { SafeAreaView, View, Text } from "react-native";
import { useProgram, useUserAccounts, useXnftProvider } from "~context";
import tw from "~tw";

const HomePage = () => {
  const { provider } = useXnftProvider();
  const { mfiClient, mfiClientReadonly } = useProgram();
  const { activeBankInfos, accountSummary } = useUserAccounts();

  console.log("activeBankInfos", activeBankInfos);
  console.log("accountSummary", accountSummary);
  console.log("mfiClient", mfiClient);
  console.log("mfiClientReadonly", mfiClientReadonly);

  return (
    <SafeAreaView style={tw`h-full w-full`}>
      <View style={tw`h-full w-full`}>
        <Text style={tw`h-full w-full`}>{provider?.publicKey?.toBase58()}</Text>
      </View>
    </SafeAreaView>
  );
};

export { HomePage };
