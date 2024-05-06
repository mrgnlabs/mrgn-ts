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
    <div className="relative">
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
      <svg
        className="absolute -top-1/2 left-1/2 -translate-y-16 -translate-x-1/2"
        width="1251"
        height="785"
        viewBox="0 0 1251 785"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter="url(#filter0_f_48_3597)">
          <path
            d="M992 526.5C992 455.555 953.387 387.515 884.655 337.349C815.923 287.183 722.702 259 625.5 259C528.298 259 435.077 287.183 366.345 337.349C297.613 387.515 259 455.555 259 526.5L625.5 526.5H992Z"
            fill="url(#paint0_linear_48_3597)"
          />
        </g>
        <defs>
          <filter
            id="filter0_f_48_3597"
            x="0.899994"
            y="0.899994"
            width="1249.2"
            height="783.7"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="129.05" result="effect1_foregroundBlur_48_3597" />
          </filter>
          <linearGradient
            id="paint0_linear_48_3597"
            x1="410.949"
            y1="513"
            x2="821.811"
            y2="515.955"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#B8AC9D" />
            <stop offset="0.5" stopColor="#52534E" />
            <stop offset="1" stopColor="#DEE873" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
