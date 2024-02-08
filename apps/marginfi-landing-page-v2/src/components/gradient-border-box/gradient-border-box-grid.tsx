import { GradientBorderBox } from "./gradient-border-box";

type GradientBorderBoxGridProps = {
  boxes: {
    icon?: string;
    title: string;
    body?: string;
    action?: {
      href: string;
      text: string;
    };
  }[];
};

export const GradientBorderBoxGrid = ({ boxes }: GradientBorderBoxGridProps) => {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center text-center gap-6 py-8 px-6 md:flex-row xl:gap-24 md:py-16">
      {boxes.map((box, index) => (
        <GradientBorderBox key={index} icon={box.icon} heading={box.title} body={box.body} action={box.action} />
      ))}
    </div>
  );
};
