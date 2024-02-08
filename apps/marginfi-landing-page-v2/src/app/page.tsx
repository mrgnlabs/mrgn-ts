import { content } from "./data";

import { Hero } from "~/components/hero";
import { GradientBorderBox } from "~/components/gradient-border-box";
import { StatsBanner } from "~/components/stats-banner/stats-banner";

export default function Home() {
  return (
    <main>
      <Hero heading={content.hero.heading} subHeading={content.hero.subHeading} />
      <div className="w-full max-w-6xl mx-auto flex items-center text-center gap-24 py-16">
        {content.gradientBorderBoxes.map((box, index) => (
          <GradientBorderBox
            key={index}
            icon={box.icon}
            heading={box.title}
            description={box.description}
            action={box.action}
          />
        ))}
      </div>
      <StatsBanner stats={content.statsBanner.stats} />
    </main>
  );
}
