import Image from "next/image";

const CONTENT = {
  heading: <>Here&apos;s more of what we&apos;re building</>,
  features: [
    {
      heading: "The first Liquidity Layer with MEV-optimized settlement",
      body: (
        <>
          <p>
            marginfi is building MEV-optimized bundling across liquidations, swaps, and flashloans to protect users &
            secure value.
          </p>
          <p className="text-primary">Join us as we advance our MEV initiatives!</p>
        </>
      ),
    },
    {
      heading: "The first Liquidity Layer with enshrined, liquid primitives",
      body: (
        <>
          <p className="text-primary">All developers can build on:</p>
          <ul className="list-disc space-y-2 ml-4">
            <li>mrgnlend: one of crypto&apos;s most used lend/borrow venues</li>
            <li>YBX: marginfi&apos;s decentralized, yield accruing stable asset</li>
            <li>mrgnswap: crypto&apos;s exciting new integrated stableswap</li>
          </ul>
        </>
      ),
    },
    {
      heading: "The first Liquidity Layer without fragmentation",
      body: (
        <>
          <p>
            marginfi is directly integrated with the Solana blockchain. Developers and users have atomic composability
            with any other Solana-based application.
          </p>
        </>
      ),
    },
  ],
};

export const Features = () => {
  return (
    <div className="relative container space-y-24 py-16 z-20 lg:py-24" id="features">
      <h2 className="text-4xl max-w-5xl mx-auto w-full font-medium text-center lg:text-5xl">{CONTENT.heading}</h2>
      <div className="flex flex-col gap-12 max-w-3xl mx-auto w-full lg:gap-6">
        {CONTENT.features.map((feature, index) => (
          <div className="flex flex-col w-full bg-secondary rounded-lg lg:flex-row" key={index}>
            <Image
              src={`/illustrations/${index + 1}.svg`}
              alt={feature.heading}
              width={200}
              height={200}
              className="w-full object-cover lg:w-auto rounded-t-lg lg:rounded-tr-none lg:rounded-bl-lg"
            />
            <div className="flex flex-col justify-center p-6 space-y-3 lg:text-sm">
              <h3 className="text-lg text-secondary-foreground lg:text-base">{feature.heading}</h3>
              <div className="text-muted-foreground space-y-4">{feature.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
