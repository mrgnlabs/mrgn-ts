import React, { FC } from "react";
import { View, Text, Pressable, StyleSheet, ImageBackground } from "react-native";
import Modal from "react-native-modal";
import { useRecoilState } from "recoil";
import { useNavigation } from "@react-navigation/native";

import { NavLinkInfo, ORDERED_MOBILE_LAUNCHER_LINKS, isSideDrawerVisible } from "~/consts";
import { BackIcon, MrgnIcon } from "~/assets/icons";
import tw from "~/styles/tailwind";

const styles = StyleSheet.create({
  bgLine: {
    // bac,
  },
  // .bg-lines {
  //   background-image: url(../../assets/WaveBG2.png);
  //   background-size: 900px;
  //   background-repeat: no-repeat;
  //   background-position: 40%;
  // }
});

export function DrawerMenu() {
  const [isMenuVisible, setIsMenuVisible] = useRecoilState(isSideDrawerVisible);

  return (
    <Modal
      isVisible={isMenuVisible}
      animationIn="slideInLeft"
      animationOut="slideOutLeft"
      onBackButtonPress={() => setIsMenuVisible(!isMenuVisible)}
      onBackdropPress={() => setIsMenuVisible(!isMenuVisible)}
      style={{ margin: 0 }}
    >
      <View style={tw`absolute top-0 left-0 w-[70%] max-w-[300px] h-full bg-[#0F1111] border-r-[1px] border-r-[#333]`}>
        <ImageBackground
          source={{ uri: "https://app.marginfi.com/_next/static/media/WaveBG2.9c38210a.png" }}
          resizeMode="cover"
          style={tw`h-full w-full p-4`}
        >
          <View style={tw`h-[40px] flex flex-row justify-between mb-3 items-center`}>
            <MrgnIcon width={35} height={35} />
            <Pressable onPress={() => setIsMenuVisible(!isMenuVisible)}>
              <BackIcon width={16} height={16} />
            </Pressable>
          </View>
          <View style={tw`pb-9 flex flex-col justify-between`}>
            <View style={[tw`gap-3 p-7`, { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }]}>
              {ORDERED_MOBILE_LAUNCHER_LINKS.map((link) => (
                <AppLink
                  key={link.label}
                  name={link.name}
                  label={link.label}
                  alt={link.alt}
                  Icon={link.Icon}
                  onClick={() => setIsMenuVisible(!isMenuVisible)}
                  Comp={link.Comp}
                />
              ))}
            </View>
            <View style={tw`w-full flex flex-col gap-4 justify-center items-center`}>
              <View style={tw`w-4/5 flex flex-wrap gap-4 justify-center`}>
                {/* {EXTERNAL_QUICK_LINKS.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[24px] flex justify-center items-center"
              >
                <link.Icon className="w-full h-full pb-1 text-xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
              </Link>
            ))} */}
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const AppLink: FC<NavLinkInfo & { onClick?: () => void }> = ({ name, label, Icon, alt, onClick }) => {
  const navigation = useNavigation();

  const isActive = (navigation as any).getCurrentRoute().name === name; // router.pathname === href;

  return (
    <View style={tw`w-full h-[70px]`}>
      <Pressable
        onPress={() => {
          navigation.navigate(name as never);
          if (onClick) onClick();
        }}
        style={tw`w-full h-full flex flex-col justify-center items-center rounded-md bg-black border-[1px] ${
          isActive ? "border-[#DCE85D]" : "border-[#999]"
        }`}
      >
        <Icon height={20} width={20} color={isActive ? "#DCE85D" : "#999"} />
        <Text style={tw`font-[400] text-sm ${isActive ? "text-[#DCE85D]" : "text-[#999]"}`}>{label}</Text>
      </Pressable>
    </View>
  );
};
