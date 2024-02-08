import { Hero } from "~/components/hero";
import { GradientBorderBox } from "~/components/gradient-border-box";
import { StatsBanner } from "~/components/stats-banner/stats-banner";

import { Button } from "~/components/ui/button";
import { IconSolana, IconSparkles } from "~/components/ui/icons";

export default function Home() {
  return (
    <main>
      <Hero />
      <div className="w-full max-w-6xl mx-auto flex items-center text-center gap-24 py-16">
        <GradientBorderBox
          icon={<IconSolana size={32} />}
          title="Eu fugiat pariatur incididunt veniam voluptate duis eiusmod."
          description="Dolore nulla in sunt voluptate duis eiusmod ullamco Lorem. Ut aliquip quis proident sit. Est proident incididunt."
          action={<Button variant="default">Call to action</Button>}
        />
        <GradientBorderBox
          icon={<IconSparkles size={32} />}
          title="Culpa ad eu officia veniam pariatur eiusmod aute nisi eu."
          description="Laborum ut anim voluptate minim laboris. Sint voluptate pariatur aute nisi eu. Ut commodo amet id adipisicing non."
          action={<Button>Call to action</Button>}
        />
      </div>
      <StatsBanner />
    </main>
  );
}
