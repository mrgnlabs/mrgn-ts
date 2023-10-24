import React from "react";
import { View } from "react-native";
import ContentLoader, { Rect, Circle, IContentLoaderProps } from "react-content-loader/native";

import tw from "~/styles/tailwind";

export const PoolCardSkeleton = (props?: JSX.IntrinsicAttributes & IContentLoaderProps) => (
  <View style={tw`bg-[#1C2125] rounded-xl px-12px py-16px gap-16px max-w-sm min-w-[300px]`}>
    <ContentLoader
      speed={2}
      width={310.4}
      height={176.8}
      viewBox="0 0 310.4 176.8"
      backgroundColor="#454545"
      foregroundColor="#ecebeb"
      animate={false}
      collapsable={"false" as any}
      {...props}
    >
      {/* token icon */}
      <Circle cx="20" cy="20" r="20" />

      {/* top left squares */}
      <Rect x="50" y="6" rx="3" ry="3" width="34" height="12" />
      <Rect x="50" y="23" rx="3" ry="3" width="34" height="12" />

      {/* top right square */}
      <Rect x="238" y="13" rx="3" ry="3" width="61" height="12" />

      {/* long bottom square */}
      <Rect x="5" y="143" rx="3" ry="3" width="289" height="28" />

      {/* row squares */}
      <Rect x="5" y="58" rx="3" ry="3" width="82" height="62" />
      <Rect x="104" y="58" rx="3" ry="3" width="82" height="62" />
      <Rect x="203" y="58" rx="3" ry="3" width="82" height="62" />
    </ContentLoader>
  </View>
);
