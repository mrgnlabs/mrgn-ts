import { GradientBorderBox } from "./gradient-border-box";

import type { Block } from "~/types";

type GradientBorderBoxGridProps = {
  boxes: Block[];
};

export const GradientBorderBoxGrid = ({ boxes }: GradientBorderBoxGridProps) => {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center text-center gap-6 py-8 px-8 md:px-6 md:flex-row xl:gap-24 md:py-16">
      {boxes.map((box, index) => (
        <GradientBorderBox
          key={index}
          icon={box.icon}
          heading={box.heading}
          body={box.body}
          action={box.action}
          delayed={index % 2 !== 0}
        />
      ))}
    </div>
  );
};
