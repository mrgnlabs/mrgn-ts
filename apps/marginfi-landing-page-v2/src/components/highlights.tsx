import { getVideoUrl } from "~/lib/utils";

const CONTENT = {
  subHeading: "Plug directly into...",
  highlights: ["$500M of liquidity", "Access over 200,000 users", "A host of supporting on and off-chain systems"],
};

export const Highlights = () => {
  return (
    <div className="relative" id="highlights">
      <div className="relative h-[75vh] container max-w-7xl flex justify-between items-center pt-24 z-20">
        <h2 className="text-8xl font-medium w-1/2">
          If you&apos;re a developer,{" "}
          <span className="bg-gradient-to-r from-mrgn-gold to-mrgn-chartreuse text-transparent bg-clip-text">
            there&apos;s more
          </span>
        </h2>
        <div className="space-y-2">
          <p className="text-muted-foreground">{CONTENT.subHeading}</p>
          <ul className="text-primary text-lg space-y-1">
            {CONTENT.highlights.map((highlight) => (
              <li>{highlight}</li>
            ))}
          </ul>
        </div>
      </div>
      <video className="absolute top-0 left-0 -translate-y-1/2 z-0 w-screen h-screen object-cover" autoPlay muted>
        <source src={getVideoUrl("highlights")} type="video/mp4" />
      </video>
    </div>
  );
};
