import { Button } from "~/components/ui/button";
import { IconSolana, IconSparkles } from "~/components/ui/icons";

import "./gradient-border-box.css";
import Link from "next/link";

type GradientBorderBoxProps = {
  icon?: string;
  heading: string;
  description?: string;
  action?: {
    href: string;
    text: string;
  };
};

export const GradientBorderBox = ({ icon, heading, description, action }: GradientBorderBoxProps) => {
  return (
    <div className="gradient-border-box py-10 px-16 w-full h-full">
      {icon && <Icon name={icon} />}
      <h2 className="text-xl font-medium">{heading}</h2>
      {description && <p className="text-sm text-muted-foreground mt-3">{description}</p>}
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
