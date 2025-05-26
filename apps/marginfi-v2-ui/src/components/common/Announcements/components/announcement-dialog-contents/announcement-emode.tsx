import React from "react";
import { IconCheck } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { IconMrgn, IconEmode } from "~/components/ui/icons";

const AnnouncementEmode = () => {
  return (
    <div className="pb-16 pt-14 bg-background-gray-dark">
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center text-center gap-8">
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <IconMrgn size={48} />
          <h1 className="text-4xl font-medium flex items-center gap-2">
            Introducing{" "}
            <div className="flex items-center gap-0.5 text-purple-400">
              <IconEmode size={32} className="translate-y-0.5" />
              <span>e-mode</span>
            </div>
          </h1>
          <p className="text-lg">
            We&apos;re excited to introduce e-mode, a new feature that allows you to maximize your borrowing power.
          </p>
        </div>
        <ul className="space-y-2 font-medium">
          <li>Grouped assets with boosted weights</li>
          <li>Increased collateral efficiency</li>
          <li>More borrowing power</li>
        </ul>
        <div className="pt-4 flex w-full gap-4">
          <Button variant="secondary" size="sm" className="w-full">
            Learn More
          </Button>
          <Button size="sm" className="w-full">
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export { AnnouncementEmode };
