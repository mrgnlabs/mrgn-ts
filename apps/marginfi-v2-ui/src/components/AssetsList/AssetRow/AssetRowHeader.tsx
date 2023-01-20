import { TableCell } from "@mui/material";
import { FC } from "react";
import { percentFormatter } from "~/utils";
import Image from "next/image";

interface AssetRowHeader {
  assetName: string;
  apy: number;
  icon?: string;
  textBold?: boolean;
  isInLendingMode: boolean;
}

const AssetRowHeader: FC<AssetRowHeader> = ({
  assetName,
  apy,
  icon,
  textBold,
  isInLendingMode,
}) => (
  <TableCell
    className="text-white h-full w-full border-hidden px-0.5 lg:pr-0 flex justify-start items-center max-w-[250px] gap-1 min-w-fit"
  >
    <div className="flex justify-start items-center min-w-fit">
      {icon && (
        <Image
          src={icon}
          alt={assetName}
          height={25}
          width={25}
          className="mr-2"
        />
      )}
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
    <div
      // @todo font size here should technically be smaller, but tailwind doesn't offer smaller sizing
      // pointing to a likely readibility problem.
      // resolve with design.
      className="px-1 text-sm text-[#868E95] hidden lg:flex"
      style={{
        fontFamily: "Aeonik Pro",
        fontWeight: textBold ? 400 : 300,
      }}
    >
      Current APY
    </div>
    <div
      // @todo font size here should technically be smaller, but tailwind doesn't offer smaller sizing
      // pointing to a likely readibility problem.
      // resolve with design.
      className={`flex justify-center items-center px-2 text-[${
        isInLendingMode ? "#3AFF6C" : "#EEB9BA"
      }] bg-[${
        isInLendingMode ? "#3aff6c1f" : "#db383e4d"
      }] rounded-xl text-sm`}
      style={{
        fontFamily: "Aeonik Pro",
        fontWeight: textBold ? 400 : 300,
      }}
    >
      {percentFormatter.format(apy)}
    </div>
  </TableCell>
);

export { AssetRowHeader };
