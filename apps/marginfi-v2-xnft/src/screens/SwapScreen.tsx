import React from "react";
import { Text } from "react-native";

import tw from "~/styles/tailwind";

import { Screen } from "~/components/Common";

export function SwapScreen() {
  return (
    <Screen>
      <Text style={tw`text-secondary b-600`}>Swap page</Text>
      {/* <Text style={tw`mb-4`}>
        You'll find several examples of how to build xNFTs using react-native:
      </Text>
      <FlatList
        data={features}
        keyExtractor={(item) => item}
        renderItem={({ item }) => <Text>- {item}</Text>}
      /> */}
    </Screen>
  );
}
