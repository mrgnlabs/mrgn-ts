import React, { Dispatch, FC, SetStateAction, useState } from "react";
import { nativeToUi, numeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { View, Text, Image, Pressable } from "react-native";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import tw from "~/styles/tailwind";
import { SOL_MINT, TokenDataMap } from "~/store/lstStore";
import { StakeData } from "~/utils";
import { CloseIcon, ExternalIcon } from "~/assets/icons";

import { StakeTabSwitch } from "../StakeTabSwitch";
import { DepositOption } from "../StakingCard.utils";

interface StakingModalProps {
  handleClose: () => void;
  depositOption: DepositOption;
  setDepositOption: Dispatch<SetStateAction<DepositOption>>;
  availableLamports: BN | null;
  solUsdPrice: number;
  tokenDataMap: TokenDataMap;
  stakeAccounts: StakeData[];
}

export const StakingModal: FC<StakingModalProps> = ({
  handleClose,
  depositOption,
  setDepositOption,
  availableLamports,
  solUsdPrice,
  tokenDataMap,
  stakeAccounts,
}) => {
  const [isStakeAccountMode, setIsStakeAccountMode] = useState<boolean>(depositOption.type === "stake");

  return (
    <View style={tw`flex flex-col rounded-xl bg-[#1C2023] w-full h-[400px] p-4`}>
      <View style={tw`min-h-[40px] flex flex-row justify-between`}>
        <View style={tw`w-[88%]`}>
          <StakeTabSwitch isChecked={!isStakeAccountMode} setChecked={setIsStakeAccountMode} />
        </View>
        <Pressable
          style={tw`w-[10%] flex flex-row justify-center items-center cursor-pointer`}
          onPress={() => handleClose()}
        >
          <CloseIcon color="white" />
        </Pressable>
      </View>
      <View style={tw`flex my-4 gap-2`}>
        <Text style={tw`text-primary font-[500] text-[22px]`}>
          {isStakeAccountMode ? "Select stake account" : "Select token"}
        </Text>
      </View>
      <View style={tw`flex flex-col overflow-y-auto pr-1`}>
        {isStakeAccountMode ? (
          stakeAccounts.length > 0 ? (
            <StakeAccountList
              depositOption={depositOption}
              stakeAccounts={stakeAccounts}
              setSelectedStakeAccount={setDepositOption}
              handleClose={handleClose}
            />
          ) : (
            <View style={tw`flex justify-center mt-2`}>
              <Text style={tw`text-primary font-[300] text-secondary text-lg text-primary`}>
                No eligible stake accounts found
              </Text>
            </View>
          )
        ) : (
          <TokenList
            depositOption={depositOption}
            availableLamports={availableLamports}
            solUsdPrice={solUsdPrice}
            tokenDataMap={tokenDataMap}
            setDepositOption={setDepositOption}
            handleClose={handleClose}
          />
        )}
      </View>
    </View>
  );
};

const TokenList: FC<{
  availableLamports: BN | null;
  solUsdPrice: number;
  tokenDataMap: TokenDataMap;
  depositOption: DepositOption;
  setDepositOption: Dispatch<SetStateAction<DepositOption>>;
  handleClose: () => void;
}> = ({ availableLamports, solUsdPrice, tokenDataMap, depositOption, setDepositOption, handleClose }) => {
  if (availableLamports === null) {
    return <></>;
  }

  const availableLamportsUi = nativeToUi(availableLamports, 9);
  const lamportsUsdValue = availableLamportsUi * solUsdPrice;

  return (
    <View style={tw`flex flex-col justify-center items-center gap-2`}>
      <Pressable
        key={"nativeSol"}
        onPress={() => {
          setDepositOption({ type: "native", amount: new BN(0), maxAmount: availableLamports });
          handleClose();
        }}
        style={tw`flex flex-row w-full justify-between font-aeonik font-[400] text-base items-center gap-4 p-2 rounded-lg ${
          depositOption.type === "native" ? "bg-[#DCE85D88]" : ""
        } hover:text-white hover:bg-gray-700 cursor-pointer`}
      >
        <View style={tw`flex flex-row items-center gap-2`}>
          <Image
            source={{
              uri: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
            }}
            alt="token logo"
            style={[tw`rounded-full`, { height: 35, width: 35 }]}
          />

          <View style={tw`flex flex-col justify-start`}>
            <Text style={tw`text-[15px] text-primary`}>{"SOL (native)"}</Text>
            <AccountBadge account={SOL_MINT} type="token" />
          </View>
        </View>
        <View style={tw`flex flex-row items-center`}>
          {availableLamportsUi > 0 && (
            <View style={tw`flex flex-col justify-end`}>
              <Text style={tw`flex justify-end text-sm text-primary`}>
                {availableLamportsUi < 0.01 ? "< 0.01" : numeralFormatter(availableLamportsUi)}
              </Text>
              <Text style={tw`flex justify-end text-sm text-[#BBB]`}>
                {lamportsUsdValue < 0.01 ? "< $0.01" : `$${numeralFormatter(lamportsUsdValue)}`}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {[...tokenDataMap.values()]
        .filter((token) => token.balance.gtn(0))
        .sort(
          (a, b) =>
            nativeToUi(b.balance, b.decimals) * Number(b.price) - nativeToUi(a.balance, a.decimals) * Number(a.price)
        )
        .map((token) => {
          const balanceUi = nativeToUi(token.balance, token.decimals);
          const usdValue = balanceUi * token.price;
          return (
            <Pressable
              key={token.address}
              onPress={() => {
                setDepositOption({ type: "token", tokenData: token, amount: new BN(0) });
                handleClose();
              }}
              style={tw`flex flex-row w-full justify-between font-aeonik font-[400] text-base items-center gap-4 p-2 rounded-lg cursor-pointer ${
                depositOption.type === "token" && depositOption.tokenData.address === token.address
                  ? "text-black bg-[#DCE85D88]"
                  : ""
              }`}
            >
              <View style={tw`flex flex-row items-center gap-2`}>
                <Image
                  source={{ uri: token.iconUrl }}
                  alt="token logo"
                  style={[tw`rounded-full`, { height: 35, width: 35 }]}
                />
                <View style={tw`flex flex-col justify-start`}>
                  <Text style={tw`text-[15px] text-primary`}>
                    {token.address === SOL_MINT.toBase58() ? "SOL (wrapped)" : token.symbol}
                  </Text>
                  <AccountBadge account={token.address} type="token" />
                </View>
              </View>
              <View style={tw`flex flex-row items-center`}>
                {token.balance.gtn(0) && (
                  <View style={tw`flex flex-col justify-end`}>
                    <Text style={tw`flex justify-end text-sm text-primary`}>
                      {balanceUi < 0.01 ? "< 0.01" : numeralFormatter(balanceUi)}
                    </Text>
                    <Text style={tw`flex justify-end text-sm text-[#BBB]`}>
                      {usdValue < 0.01 ? "< $0.01" : `$${numeralFormatter(usdValue)}`}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
    </View>
  );
};

const StakeAccountList: FC<{
  depositOption: DepositOption;
  stakeAccounts: StakeData[];
  setSelectedStakeAccount: Dispatch<SetStateAction<DepositOption>>;
  handleClose: () => void;
}> = ({ depositOption, stakeAccounts, setSelectedStakeAccount, handleClose }) => {
  return (
    <View style={tw`flex flex-col gap-2`}>
      {stakeAccounts
        .sort((a, b) => b.lamports.sub(a.lamports).toNumber())
        .map((stakeData) => {
          return (
            <Pressable
              key={stakeData.address.toBase58()}
              onPress={() => {
                setSelectedStakeAccount({ type: "stake", stakeData });
                handleClose();
              }}
            >
              <View
                style={tw`flex flex-row w-full justify-between font-aeonik font-[400] text-base items-center gap-4 p-2 rounded-lg hover:text-white hover:bg-gray-700 cursor-pointer ${
                  depositOption.type === "stake" && depositOption.stakeData.address === stakeData.address
                    ? "text-black bg-[#DCE85D88]"
                    : ""
                }`}
              >
                <View style={tw`flex flex-row items-center gap-2`}>
                  <Image
                    source={{
                      uri: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
                    }}
                    alt="token logo"
                    style={[tw`rounded-full`, { height: 35, width: 35 }]}
                  />
                  <AccountBadge account={stakeData.address} type="stake" />
                </View>
                <View style={tw`flex flex-row items-center w`}>
                  <Text style={tw`text-primary`}>{nativeToUi(stakeData.lamports, 9)} SOL</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
    </View>
  );
};

type AccountType = "token" | "stake";

const AccountBadge: FC<{ account: PublicKey | string; type: AccountType }> = ({ account, type }) => (
  <Text
    style={tw`w-[100px] text-secondary h-[16px] flex flex-row gap-3 rounded-md bg-[#DCE85D] px-2 py-1 text-xs justify-center`}
  >
    {shortenAddress(account)}
    <ExternalIcon height={12} width={12} />
  </Text>
);
