import { content } from "./data";

import { Hero } from "~/components/hero";
import { GradientBorderBoxGrid } from "~/components/gradient-border-box";
import { StatsBanner } from "~/components/stats-banner/stats-banner";
import { FeatureBlockCentered, FeatureBlocksGrid } from "~/components/feature-blocks";

export default function Home() {
  return (
    <main>
      <Hero heading={content.hero.heading} subHeading={content.hero.subHeading} />
      <GradientBorderBoxGrid boxes={content.gradientBorderBoxes} />
      <StatsBanner stats={content.statsBanner.stats} />
      <FeatureBlockCentered
        heading={content.featuredBlocks.featured[0].heading}
        body={content.featuredBlocks.featured[0].body}
        actions={content.featuredBlocks.featured[0].actions}
      />
      <FeatureBlocksGrid blocks={content.featuredBlocks.blocks} />
      <FeatureBlockCentered
        variant="secondary"
        heading={content.featuredBlocks.featured[1].heading}
        body={content.featuredBlocks.featured[1].body}
        actions={content.featuredBlocks.featured[1].actions}
      />
    </main>
  );
}
