import { content } from "./data";

import { Hero } from "~/components/hero";
import { GradientBorderBoxGrid } from "~/components/gradient-border-box";
import { StatsBanner } from "~/components/stats-banner/stats-banner";
import { FeatureBlockCentered, FeatureBlockGrid } from "~/components/feature-block";

export default function Home() {
  return (
    <main>
      <Hero heading={content.hero.heading} subHeading={content.hero.subHeading} />
      <GradientBorderBoxGrid boxes={content.gradientBorderBoxes} />
      <StatsBanner stats={content.statsBanner.stats} />
      <FeatureBlockCentered
        heading={content.featuredBlocks.featured.heading}
        body={content.featuredBlocks.featured.body}
        actions={content.featuredBlocks.featured.actions}
      />
      <FeatureBlockGrid blocks={content.featuredBlocks.blocks} />
    </main>
  );
}
