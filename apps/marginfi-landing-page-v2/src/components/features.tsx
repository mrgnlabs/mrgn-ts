import Image from "next/image";

const CONTENT = {
  heading: "Here’s what we bring to the table",
  features: [
    {
      heading: "The first Liquidity Layer with MEV-optimized settlement",
      body: (
        <>
          <p>
            Expanding liquidation, stableswap, and flashloan capabilities, marginfi will use Jito bundles for user
            protection.
          </p>
          <p className="text-primary">Join us as we advance our MEV capture initiatives!</p>
        </>
      ),
    },
    {
      heading: "The first Liquidity Layer with enshrined, liquid primitives",
      body: (
        <>
          <p className="text-primary">All developers can build on:</p>
          <ul className="list-disc space-y-2 ml-4">
            <li>mrgnlend, Solana largest DeFi dApp</li>
            <li>YBX, marginfi's integrated SOL-backed stablecoin (coming Q1)</li>
            <li>mrgnswap, marginfi's integrated stableswap (coming Q2)</li>
          </ul>
        </>
      ),
    },
    {
      heading: "Enhancing Solana's liquidity without draining resources",
      body: (
        <>
          <p>
            Marginfi enhances Solana by providing integrated liquidity directly, avoiding the resource drain often seen
            with ETH L2's on Ethereum, and eliminates the need for bridging.
          </p>
        </>
      ),
    },
  ],
};

export const Features = () => {
  return (
    <div className="relative container space-y-24 py-24 z-20">
      <h2 className="text-5xl max-w-5xl mx-auto w-full font-medium text-center">{CONTENT.heading}</h2>
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
        {CONTENT.features.map((feature, index) => (
          <div className="flex w-full bg-secondary rounded-lg" key={index}>
            <Image
              src={`/illustrations/${index + 1}.svg`}
              alt={feature.heading}
              width={200}
              height={200}
              className="rounded-tl-lg rounded-bl-lg"
            />
            <div className="flex flex-col justify-center p-6 space-y-3 text-sm">
              <h3 className="text-secondary-foreground">{feature.heading}</h3>
              <div className="text-muted-foreground space-y-4">{feature.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
