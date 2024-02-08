import { GradientBorderBox } from "~/components/gradient-border-box";

import { Button } from "~/components/ui/button";
import { IconSolana, IconSparkles } from "~/components/ui/icons";

export const Hero = () => {
  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-6 space-y-24 text-center">
      <div className="w-full space-y-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl">
          Dolore aute cillum cupidatat velit aliquip tempor eu irure dolor culpa dolor.
        </h1>
        <h2 className="w-full max-w-3xl mx-auto text-muted-foreground md:text-lg lg:text-xl">
          Reprehenderit sit aliquip mollit aliquip Lorem amet ullamco ad minim qui. Eu culpa commodo Lorem labore.
          Pariatur fugiat anim proident deserunt anim irure.
        </h2>
      </div>
      <div className="flex items-center justify-stretch gap-24">
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
    </div>
  );
};
