import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { TokenInfo } from "@solana/spl-token-registry/dist/main/lib/tokenlist";
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Image, Linking, Pressable } from "react-native";
import tw from "~/styles/tailwind";
import * as icons from "~/assets/icons";
import { SecondaryButton } from "~/components/Common";
import { PublicKey } from "@solana/web3.js";
import { WSOL_MINT } from "~/config";
import { useJupiterStore, useMrgnlendStore } from "~/store/store";

const PAIR_SELECTOR_TOP_TOKENS = [
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "So11111111111111111111111111111111111111112", // SOL
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", // stSOL
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // ETH
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // RAY
  "A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM", // USDCet
];

export const FormPairSelector = ({
  onSubmit,
  tokenInfos,
  onClose,
}: {
  onSubmit: (value: TokenInfo) => void;
  onClose: () => void;
  tokenInfos: TokenInfo[];
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [nativeSolBalance] = useMrgnlendStore((state) => [state.nativeSolBalance]);
  const [tokenAccountMap] = useJupiterStore((state) => [state.tokenAccountMap]);

  const [resultCount, setResultCount] = useState<number>(30);

  const searchResult: TokenInfo[] = useMemo(() => {
    const sortedList = tokenInfos
      .sort((a, b) => {
        return PAIR_SELECTOR_TOP_TOKENS.includes(a.address) && !PAIR_SELECTOR_TOP_TOKENS.includes(b.address) ? -1 : 1;
      })
      .sort((a, b) => {
        if (!tokenAccountMap.get(a.address)) return 1;
        if (!tokenAccountMap.get(b.address)) return -1;

        // TODO: Sort by USD value
        // if (tokenAPrice && tokenBPrice) {
        //   const totalAValue = new Decimal(tokenAPrice).mul(
        //     accounts[a.address].balance,
        //   );
        //   const totalBValue = new Decimal(tokenBPrice).mul(
        //     accounts[b.address].balance,
        //   );
        //   return totalBValue.gt(totalAValue) ? 1 : -1;
        // }

        // If no usd value, sort by balance
        return (tokenAccountMap.get(b.address)?.balance ?? 0) - (tokenAccountMap.get(a.address)?.balance ?? 0);
      });

    if (searchTerm) {
      const filteredList = sortedList.filter((item) => item.symbol.toLowerCase().includes(searchTerm.toLowerCase()));
      return filteredList;
    } else {
      return sortedList;
    }
  }, [tokenAccountMap, tokenInfos, searchTerm]);

  return (
    <View style={tw`p-5px w-full`}>
      <View style={tw`relative`}>
        <Pressable
          onPress={() => onClose()}
          style={tw`absolute my-auto h-full cursor-pointer justify-center text-white z-10`}
        >
          <icons.LeftArrowIcon onClick={() => onClose()} height={20} width={20} />
        </Pressable>
        <Text style={tw`text-primary text-base my-10px text-center`}>Select Token</Text>
      </View>
      <View style={tw`px-20px h-56px flex flex-row gap-8px bg-background rounded-xl mb-15px text-white`}>
        <View style={tw`my-auto`}>
          <icons.SearchIcon />
        </View>
        <TextInput
          style={[tw`text-secondary rounded-xl`, { border: "none", borderWidth: "0" }, { outlineStyle: "none" } as any]}
          onChangeText={setSearchTerm}
          value={searchTerm}
          placeholder="Search"
          keyboardType="default"
        />
      </View>
      <View style={[tw`h-250px flex flex-column gap-10px`, { overflow: "auto" }]}>
        {searchResult.length > 0 &&
          searchResult.slice(0, resultCount).map((token, idx) => (
            <Pressable
              key={idx}
              style={tw`flex flex-row gap-10px bg-[#2C2D33] rounded-xl p-8px`}
              onPress={() => onSubmit(token)}
            >
              <View style={tw`my-auto`}>
                <Image style={{ height: 20, width: 20 }} source={{ uri: token.logoURI }} />
              </View>
              <View style={tw`flex flex-column gap-4px`}>
                <View style={tw`flex flex-row gap-8px`}>
                  <Text style={tw`text-primary m-auto`}>{token.symbol}</Text>
                  <Pressable
                    style={tw`flex flex-row gap-4px bg-[#212226] p-4px text-[#868e95] m-auto`}
                    onPress={() => Linking.openURL(`https://solscan.io/token/${token.address}`)}
                  >
                    <Text style={tw`text-secondary text-xs leading-none`}>{shortenAddress(token.address)}</Text>
                    <icons.ExternalIcon />
                  </Pressable>
                </View>
                <View>
                  <Text style={tw`text-secondary`}>
                    {new PublicKey(token.address).equals(WSOL_MINT)
                      ? nativeSolBalance
                      : tokenAccountMap.get(token.address)?.balance.toString() ?? 0}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        <SecondaryButton title={"Load more..."} onPress={() => setResultCount(resultCount + 20)} />
      </View>
    </View>
  );
};
