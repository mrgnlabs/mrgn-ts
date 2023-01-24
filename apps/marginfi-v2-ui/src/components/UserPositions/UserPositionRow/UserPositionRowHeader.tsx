import { TableCell } from "@mui/material";
import Image from "next/image";
import { FC } from "react";

interface UserPositionRowHeaderProps {
  assetName: string;
  // apy: number;
  icon?: string;
  textBold?: boolean;
}

const UserPositionRowHeader: FC<UserPositionRowHeaderProps> = ({
  assetName,
  // apy,
  icon,
  textBold,
}) => (
  <TableCell className="text-white h-full border-hidden max-w-fit min-w-fit px-0">
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
            fontWeight: textBold ? 400 : 300,
          }}
        >
          {assetName}
        </div>
      </div>
    </div>
  </TableCell>
);

export { UserPositionRowHeader };
