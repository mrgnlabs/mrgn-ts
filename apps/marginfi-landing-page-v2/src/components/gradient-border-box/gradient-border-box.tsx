import React from "react";

import Link from "next/link";

import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";
import { IconSolana, IconSparkles } from "~/components/ui/icons";

import type { Block } from "~/types";

import "./gradient-border-box.css";

type GradientBorderBoxProps = Block & {
  delayed?: boolean;
};

export const GradientBorderBox = ({ icon, heading, body, action, delayed }: GradientBorderBoxProps) => {
  return (
    <div className={cn("gradient-border-box w-full h-full py-8 px-12", delayed && "delayed")}>
      {icon && <Icon name={icon} />}
      <h2 className="text-xl font-medium lg:w-11/12 lg:mx-auto">{heading}</h2>
      {body && <p className="text-sm text-muted-foreground mt-3">{body}</p>}
      {action && (
        <div className="mt-8">
          <Button className="w-72 md:w-auto">
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
  const iconEl = React.useMemo(() => {
    switch (name) {
      case "solana":
        return <IconSolana />;
      case "sparkles":
        return <IconSparkles size={28} />;
      default:
        return null;
    }
  }, [name]);

  return <div className="mb-4 flex justify-center">{iconEl}</div>;
};
