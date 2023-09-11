import React, { FC } from "react";
import { Card, CardContent, CircularProgress } from "@mui/material";

interface PointsCheckingUserProps {}

export const PointsCheckingUser: FC<PointsCheckingUserProps> = ({}) => {
  return (
    <Card className="w-2/3 bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
      <CardContent>
        <div className="w-full flex flex-col justify-evenly items-center p-2 text-base text-white font-aeonik font-[400] rounded-xl text-center">
          <div>
            <span className="text-2xl font-[500]">Access upgraded features</span>
            <br />
            <br />
          </div>
          <div className="flex gap-3 justify-center items-center">
            <div className="w-full flex justify-center items-center">Retrieving data</div>
            <CircularProgress size="20px" sx={{ color: "#e1e1e1" }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
