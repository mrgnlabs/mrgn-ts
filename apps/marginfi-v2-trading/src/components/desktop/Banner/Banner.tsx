import { FC } from "react";

export const Banner: FC<{ text: string; backgroundColor?: string; color?: string }> = ({
  text,
  backgroundColor,
  color,
}) => {
  return (
    <div
      className={`col-span-full rounded-xl h-full flex flex-row justify-evenly items-start px-[4%] py-1 text-xl`}
      style={{ backgroundColor: backgroundColor || "#515151", color: color || "#000000" }}
    >
      {text}
    </div>
  );
};
