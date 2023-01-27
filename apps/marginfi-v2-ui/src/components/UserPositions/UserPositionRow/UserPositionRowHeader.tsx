import { TableCell } from "@mui/material";
import Image from "next/image";
import { FC } from "react";

interface UserPositionRowHeaderProps {
  assetName: string;
  icon?: string;
}

const UserPositionRowHeader: FC<UserPositionRowHeaderProps> = ({ assetName, icon }) => (
  <TableCell className="text-white h-full min-w-[90px] flex justify-start items-center px-0.5 lg:pr-0 gap-1 border-hidden">
    <div
      className="h-full w-full flex justify-start items-center p-0 text-white"
      style={{
        flexDirection: icon ? "row" : "column",
        alignItems: icon ? "center" : "flex-start",
        justifyContent: icon ? "flex-start" : "center",
      }}
    >
      {icon && <Image src={icon} alt={assetName} height={25} width={25} className="mr-2" />}
      <div>
        <div
          style={{
            fontFamily: "Aeonik Pro",
            fontWeight: 400,
          }}
        >
          {assetName}
        </div>
      </div>
    </div>
  </TableCell>
);

export { UserPositionRowHeader };
