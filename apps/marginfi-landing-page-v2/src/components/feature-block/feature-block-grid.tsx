import type { Block } from "~/types";

type FeatureBlockGridProps = {
  blocks: Block[];
};

export const FeatureBlockGrid = ({ blocks }: FeatureBlockGridProps) => {
  return (
    <div className="grid grid-cols-2">
      {blocks.map((block, index) => (
        <div key={index} className="flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-100">
            {block.icon}
          </div>
          <h3 className="mb-2 text-2xl font-semibold text-center">{block.heading}</h3>
          <p className="text-center">{block.body}</p>
        </div>
      ))}
    </div>
  );
};
