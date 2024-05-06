const CONTENT = {
  heading: "Developers and users are earning integrated, native yield in 3 ways:",
  products: [
    {
      heading: "mrgnlend",
      subHeading: "marginfi's integrated leverage hub",
      body: "Use mrgnlend as your in-app bank, a margin hub for your new finance dApp, a yield source to generate income from token holdings, or so much more.",
    },
    {
      heading: "LST",
      subHeading: "Solana's highest yielding liquid staking SOL token",
      body: "Use SOL that auto-compounds inflation and MEV rewards. Earn staking yields while keeping SOL liquidity in-dApp.",
    },
    {
      heading: "YBX",
      subHeading: "marginfi's capital-efficient, decentralized stablecoin",
      body: "Use LST liquidity in marginfi to mint YBX. Leverage stable, un-censorable, yielding money.",
    },
  ],
};

export const Products = () => {
  return (
    <div className="relative" id="products">
      <div className="container space-y-24 py-24">
        <h2 className="text-5xl max-w-5xl mx-auto w-full font-medium text-center">{CONTENT.heading}</h2>
        <ul className="max-w-7xl mx-auto w-full grid grid-cols-3 gap-32">
          {CONTENT.products.map((product, index) => (
            <li key={index} className="space-y-2">
              <h2
                className="text-7xl font-medium text-transparent bg-clip-text py-1.5 max-w-fit"
                style={{
                  backgroundImage: "linear-gradient(90.08deg, #97AFB9 54.29%, #42535A 88.18%, #2B3539 115.29%)",
                }}
              >
                {product.heading}
              </h2>
              <h3 className="text-2xl">{product.subHeading}</h3>
              <p className="text-muted-foreground">{product.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
