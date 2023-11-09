import React, { useMemo } from "react";
import { View, Image, Text, Pressable } from "react-native";
import { TokenInfo } from "@solana/spl-token-registry";
import { PublicKey } from "@solana/web3.js";

import { useSwapContext } from "~/context";
import tw from "~/styles/tailwind";
import { NumberInput } from "~/components/Common";
import * as icons from "~/assets/icons";
import { WSOL_MINT } from "~/config";
import { useJupiterStore, useMrgnlendStore } from "~/store/store";

export const SwapFormCard: React.FC<{
  token: TokenInfo;
  value: string;
  isFromToken: boolean;
  handleChangeFromValue: (value: string) => void;
  handleChangePair: () => void;
}> = ({ token, value, isFromToken, handleChangeFromValue, handleChangePair }) => {
  const [tokenAccountMap] = useJupiterStore((state) => [state.tokenAccountMap]);
  const [nativeSolBalance] = useMrgnlendStore((state) => [state.nativeSolBalance]);

  const {
    formProps: { swapMode },
  } = useSwapContext();

  const userBalance = useMemo(
    () =>
      new PublicKey(token.address).equals(WSOL_MINT)
        ? nativeSolBalance
        : tokenAccountMap.get(token.address)?.balance ?? 0,

    [token.address, tokenAccountMap, nativeSolBalance]
  );

  return (
    <View style={tw`bg-[#1C2125] rounded-xl px-12px py-16px flex flex-column gap-12px rounded-xl`}>
      <View style={tw`flex flex-row justify-between`}>
        <Pressable
          style={tw`flex flex-row justify-between px-12px py-8px w-124px rounded-xl bg-[#36373E]`}
          onPress={() => handleChangePair()}
        >
          <View style={tw`my-auto`}>
            <Image style={{ height: 20, width: 20 }} source={{ uri: token.logoURI }} />
          </View>
          <View style={tw`flex flex-row mt-4px`}>
            <Text style={tw`text-primary text-base`}>{token.symbol}</Text>
          </View>
          <View style={tw`mt-5px`}>
            <icons.ChevronDownIcon />
          </View>
        </Pressable>
        <View>
          <NumberInput
            min={0}
            amount={typeof value === "undefined" ? "" : value}
            decimals={token.decimals}
            onValueChange={(value: string) => handleChangeFromValue(value)}
            disabled={!isFromToken}
          />
        </View>
      </View>
      <View style={tw`flex flex-row justify-between`}>
        <Pressable
          style={tw`flex flex-row gap-5px`}
          onPress={() => handleChangeFromValue(userBalance.toString() ?? "0")}
        >
          <View style={tw`mt-3px`}>
            <icons.WalletIcon width={10} height={10} />
          </View>
          <Text style={tw`text-secondary text-sm`}>{userBalance.toString() ?? 0}</Text>
          <Text style={tw`text-secondary text-sm`}>{token.symbol}</Text>
        </Pressable>
        <Text style={tw`text-secondary text-sm`}></Text>
      </View>
    </View>
  );
};
