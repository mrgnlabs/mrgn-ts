import Image from "next/image";
import Link from "next/link";

import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";
import { IconSolana, IconSparkles } from "~/components/ui/icons";

import type { Block } from "~/types";

type FeatureBlockGridProps = {
  blocks: (Block & {
    image: string;
  })[];
};

export const FeatureBlocksGrid = ({ blocks }: FeatureBlockGridProps) => {
  return (
    <div className="w-full py-16 px-6">
      <div className="w-full max-w-6xl mx-auto space-y-20">
        {blocks.map((block, index) => (
          <div
            className={cn(
              "flex flex-col-reverse items-stretch gap-8 justify-between",
              "md:flex-row lg:pl-16",
              index % 2 !== 0 && "md:flex-row-reverse lg:pl-0"
            )}
            key={index}
          >
            <div
              className={cn(
                "w-full flex flex-col items-center justify-center gap-3",
                "md:w-2/5 md:items-start",
                index % 2 !== 0 && "md:w-[45%]"
              )}
            >
              {block.icon === "solana" && <IconSolana size={32} />}
              {block.icon === "sparkles" && <IconSparkles size={32} />}
              <h3 className="text-3xl font-semibold">{block.heading}</h3>
              <p className="text-muted-foreground text-center md:text-left">{block.body}</p>
              {block.action && (
                <Button variant="secondary" className="mt-4 w-72 mx-auto md:w-auto md:mx-0">
                  <Link href={block.action.href}>{block.action.text}</Link>
                </Button>
              )}
            </div>
            <div className="w-11/12 mx-auto relative min-h-[240px] md:min-h-[320px] md:w-1/2 md:mx-0 lg:w-2/5">
              <Image
                src={block.image}
                fill={true}
                alt={block.heading}
                objectFit="cover"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
