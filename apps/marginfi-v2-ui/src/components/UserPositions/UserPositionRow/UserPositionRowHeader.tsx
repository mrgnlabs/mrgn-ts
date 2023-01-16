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
  <TableCell
    className="text-white h-full border-hidden max-w-fit px-0"
    style={{
      borderBottom: "solid rgba(0,0,0,0) 2px",
    }}
  >
    <div
      className="h-full w-full flex justify-center p-0 text-white"
      style={{
        flexDirection: icon ? "row" : "column",
        alignItems: icon ? "center" : "flex-start",
        justifyContent: icon ? "flex-start" : "center",
      }}
    >
      {icon && (
        <Image
          src={`/${icon}`}
          alt={icon}
          height={"15"}
          width={"15"}
          className="mr-2"
        />
      )}
      <div>
        <div
          style={{
            fontFamily: 'Aeonik Pro',
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
