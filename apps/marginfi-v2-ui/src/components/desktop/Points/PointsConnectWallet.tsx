import React, { FC } from "react";
import { Card, CardContent } from "@mui/material";

import { WalletButton } from "~/components/common/Navbar";

interface PointsConnectWalletProps {}

export const PointsConnectWallet: FC<PointsConnectWalletProps> = ({}) => {
  return (
    <Card className="max-w-[800px] mx-auto w-full bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
      <CardContent>
        <div className="w-full flex flex-col justify-evenly items-center p-2 text-base text-white font-aeonik font-[400] rounded-xl text-center">
          <div>
            <span className="text-2xl font-[500]">Access upgraded features</span>
            <br />
            <br />
          </div>
          <div className="w-full flex justify-center items-center">
            <WalletButton />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
