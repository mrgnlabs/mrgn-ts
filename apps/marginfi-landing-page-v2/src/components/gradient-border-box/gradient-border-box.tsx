import Link from "next/link";

import { Button } from "~/components/ui/button";
import { IconSolana, IconSparkles } from "~/components/ui/icons";

import type { Block } from "~/types";

import "./gradient-border-box.css";

type GradientBorderBoxProps = Block;

export const GradientBorderBox = ({ icon, heading, body, action }: GradientBorderBoxProps) => {
  return (
    <div className="gradient-border-box py-10 px-16 w-full h-full">
      {icon && <Icon name={icon} />}
      <h2 className="text-xl font-medium">{heading}</h2>
      {body && <p className="text-sm text-muted-foreground mt-3">{body}</p>}
      {action && (
        <div className="mt-8">
          <Button>
            <Link href={action.href}></Link>
            {action.text}
          </Button>
        </div>
      )}
    </div>
  );
};

type IconProps = {
  name: string;
};

export const Icon = ({ name }: IconProps) => {
  let icon = <></>;
  switch (name) {
    case "solana":
      icon = <IconSolana />;
    case "sparkles":
      icon = <IconSparkles />;
  }

  return <div className="mb-4 flex justify-center">{icon}</div>;
};
