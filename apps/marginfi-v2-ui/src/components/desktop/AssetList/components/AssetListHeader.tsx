"use client";

import React from "react";

import { cn } from "@mrgnlabs/mrgn-utils";

type AssetListHeaderProps = {
  title: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  backgroundImage?: string;
  actionContent?: React.ReactNode;
  bgFrom?: string;
  bgTo?: string;
  className?: string;
};

const AssetListHeader = ({
  title,
  icon,
  description,
  backgroundImage,
  actionContent,
  bgFrom,
  bgTo,
  className = "",
}: AssetListHeaderProps) => {
  return (
    <div
      className={cn(
        `h-[143px] rounded-lg`,
        (!bgFrom || !bgTo) && "bg-background",
        bgFrom && bgTo && `bg-gradient-to-br ${bgFrom} ${bgTo}`,
        className
      )}
    >
      <div
        className="flex items-center justify-between space-y-2 w-full h-full bg-cover bg-center px-8"
        style={backgroundImage ? { backgroundImage: `url("${backgroundImage}")` } : {}}
      >
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-3xl font-medium">
            {icon && icon} {title}
          </h2>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {actionContent && actionContent}
      </div>
    </div>
  );
};

export { AssetListHeader };