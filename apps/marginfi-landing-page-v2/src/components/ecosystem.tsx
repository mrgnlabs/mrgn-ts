"use client";

import React from "react";

import Link from "next/link";
import Image from "next/image";

import { IconArrowRight, IconBrandGithubFilled, IconExternalLink } from "@tabler/icons-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import shuffle from "lodash/shuffle";

import { cn } from "~/lib/utils";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

const CONTENT = {
  heading: "A full ecosystem powered by the marginfi SDK",
  body: "Build something the world hasn't seen yet. The mrgn. community is waiting for you.",
  cards: [
    {
      title: "marginfi v2",
      description: "V2 of the marginfi protocol",
      url: "https://app.marginfi.com",
      github: "https://github.com/mrgnlabs/marginfi-v2",
      repo: "mrgnlabs/marginfi-v2",
      author: {
        name: "marginfi",
        avatar: "/images/mrgn_logo_192.png",
        url: "https://marginfi.com",
      },
    },
    {
      title: "marginfi ui",
      description: "The official marginfi UI",
      url: "https://app.marginfi.com",
      github: "https://github.com/mrgnlabs/mrgn-ts/tree/main/apps/marginfi-v2-ui",
      repo: "mrgnlabs/mrgn-ts",
      author: {
        name: "marginfi",
        avatar: "/images/mrgn_logo_192.png",
        url: "https://marginfi.com",
      },
    },
    {
      title: "marginfi xnft",
      description: "The official marginfi xNFT",
      url: "https://www.xnft.gg/app/DoXjr5LKZp9uxiwEUhffBwCQrf2xdkiDYeitGGvfcyXm",
      github: "https://github.com/mrgnlabs/mrgn-ts/tree/main/apps/marginfi-v2-xnft",
      repo: "mrgnlabs/mrgn-ts",
      author: {
        name: "marginfi",
        avatar: "/images/mrgn_logo_192.png",
        url: "https://marginfi.com",
      },
    },
    {
      title: "marginfi liquidator",
      description: "Example liquidator",
      github: "https://github.com/mrgnlabs/mrgn-ts/tree/main/apps/alpha-liquidator",
      repo: "mrgnlabs/mrgn-ts",
      author: {
        name: "marginfi",
        avatar: "/images/mrgn_logo_192.png",
        url: "https://marginfi.com",
      },
    },
    {
      title: "omni",
      description: "Autonomous agent interacting with crypto protocols",
      github: "https://github.com/mrgnlabs/mrgn-ts/tree/main/apps/omni",
      url: "https://omni.marginfi.com/",
      repo: "mrgnlabs/mrgn-ts",
      author: {
        name: "marginfi",
        avatar: "/images/mrgn_logo_192.png",
        url: "https://marginfi.com",
      },
    },
    {
      title: "dune analytics",
      description: "MarginFi Dune Analytics dashboard",
      url: "https://dune.com/man0s/marginfi/",
      author: {
        name: "man0s",
        avatar: "https://pbs.twimg.com/profile_images/1597050177084325889/YRXpZdxn_400x400.jpg",
        url: "https://twitter.com/losman0s",
      },
    },
    {
      title: "account search",
      description: "Search accounts by wallet or .sol domain",
      url: "https://mrgn-account-search.vercel.app/",
      github: "https://github.com/mrgnlabs/mrgn-account-search",
      repo: "mrgnlabs/mrgn-account-search",
      author: {
        name: "chambaz",
        avatar: "https://pbs.twimg.com/profile_images/1744698619947528192/7uW-BVAn_400x400.jpg",
        url: "https://twitter.com/chambaz",
      },
    },
    {
      title: "borrow caps",
      description: "Borrow availability for major assets",
      url: "https://marginfi-borrow-caps.vercel.app/",
      github: "https://github.com/gohyun14/marginfi-borrow-caps",
      repo: "gohyun14/marginfi-borrow-caps",
      author: {
        name: "0xCosmic",
        avatar: "https://pbs.twimg.com/profile_images/1720548857904291840/TSUNn3BC_400x400.jpg",
        url: "https://twitter.com/0xCosmic_",
      },
    },
    {
      title: "health check",
      description: "Account health tracker / simulator",
      url: "https://marginfi-borrow-caps.vercel.app/health",
      github: "https://github.com/gohyun14/marginfi-borrow-caps",
      repo: "gohyun14/marginfi-borrow-caps",
      author: {
        name: "0xCosmic",
        avatar: "https://pbs.twimg.com/profile_images/1720548857904291840/TSUNn3BC_400x400.jpg",
        url: "https://twitter.com/0xCosmic_",
      },
    },
    {
      title: "Juicer",
      description: "Discover yield opportunities on Solana",
      url: "https://beta.juicer.fi/borrow-lend",
      author: {
        name: "juicerfi",
        avatar: "https://pbs.twimg.com/profile_images/1767957333668192256/LGEetjVV_400x400.jpg",
        url: "https://twitter.com/juicerfi",
      },
    },
    {
      title: "DreamOS",
      description: "The operating system for web3",
      url: "https://www.dreamos.app/",
      author: {
        name: "DreamOS",
        avatar: "https://pbs.twimg.com/profile_images/1769861055541329920/3pVxclYQ_400x400.jpg",
        url: "https://twitter.com/theDreamOS",
      },
    },
    {
      title: "Fluxbot",
      description: "Solana's #1 Telegram Trading Bot",
      url: "https://fluxbot.xyz/",
      author: {
        name: "FluxBeam",
        avatar: "https://pbs.twimg.com/profile_images/1659266532898218005/dAQyCgCC_400x400.jpg",
        url: "https://twitter.com/FluxBeamDEX",
      },
    },
    {
      title: "Heimdall",
      description: "Account monitoring bot for Telegram",
      url: "https://t.me/HeimdallWatchBot",
      author: {
        name: "Heimdall",
        avatar: "/heimdall.jpg",
      },
    },
    {
      title: "Bags",
      description: "Coming soon...",
      url: "https://bags.fm",
      author: {
        name: "Bags",
        avatar: "https://pbs.twimg.com/profile_images/1751442866453520384/SsDbz1cU_400x400.jpg",
      },
    },
    {
      title: "Hampter",
      description: "Squeeze me, im fluff $HMTR on $SOL",
      url: "https://www.hampterfi.com/",
      author: {
        name: "Hampter",
        avatar: "https://pbs.twimg.com/profile_images/1737818252657451008/ClXs-B7y_400x400.jpg",
      },
    },
    {
      title: "Splitwave",
      description: "Your all things money on Solana!",
      url: "https://splitwave.app/",
      author: {
        name: "Splitwave",
        avatar: "https://pbs.twimg.com/profile_images/1733236904118628352/Zxvz7b9A_400x400.jpg",
      },
    },
    {
      title: "Meteora",
      description: "Building the most dynamic liquidity protocols in DeFi. Powered by Solana!",
      url: "https://www.meteora.ag/",
      author: {
        name: "Meteora",
        avatar: "https://pbs.twimg.com/profile_images/1623689233813864450/XDk-DpAP_400x400.jpg",
      },
    },
    {
      title: "Step Finance",
      description: "Portfolio Dashboard & Analytics for Solana",
      url: "https://www.step.finance/",
      author: {
        name: "Step Finance",
        avatar: "https://pbs.twimg.com/profile_images/1475429797694218242/ThXbtC9p_400x400.jpg",
      },
    },
    {
      title: "SonarWatch",
      description: "Empowering your journey on web3 with a powerful tracking tool, multichain and open-source",
      url: "https://sonar.watch/",
      author: {
        name: "SonarWatch",
        avatar: "https://pbs.twimg.com/profile_images/1709587389339811841/C9hOTnMV_400x400.jpg",
      },
    },
    {
      title: "AssetDash",
      description: "The best portfolio tracker and rewards program in crypto",
      url: "https://www.assetdash.com/",
      author: {
        name: "AssetDash",
        avatar: "https://pbs.twimg.com/profile_images/1523849014881525761/eKB3fD5c_400x400.jpg",
      },
    },
    {
      title: "Pulsar Finance",
      description: "The Most Complete Portfolio Manager In Crypto",
      url: "https://app.pulsar.finance/",
      author: {
        name: "Pulsar Finance",
        avatar: "https://pbs.twimg.com/profile_images/1610654730778296335/yaq9r3FW_400x400.jpg",
      },
    },
    {
      title: "Squads",
      description: "Smart account standard for SVM. Multisig, account abstraction and beyond",
      url: "https://squads.so/",
      author: {
        name: "Squads",
        avatar: "https://pbs.twimg.com/profile_images/1707747492014473216/0ABIvUee_400x400.jpg",
      },
    },
  ],
};

type EcoCardProps = {
  title: string;
  description?: string;
  url?: string;
  github?: string;
  author: {
    name: string;
    avatar: string;
    url?: string;
  };
};

const EcoCard = ({ title, description, url, github, author }: EcoCardProps) => {
  return (
    <Card className="relative z-10 w-full bg-secondary h-full flex flex-col justify-start">
      <CardHeader>
        <CardTitle className="font-medium text-base">{title}</CardTitle>
        {description && <CardDescription className="text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Link
          href={author.url || ""}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex items-center gap-2 text-white transition-colors hover:text-chartreuse font-medium text-sm",
            !author.url && "pointer-events-none"
          )}
        >
          <Image src={author.avatar} alt={author.name} width={24} height={24} className="rounded-full" />
          {author.name}
        </Link>
      </CardContent>
      <CardFooter className="flex gap-3 justify-between mt-auto">
        {github && (
          <Link href={github} target="_blank" rel="noreferrer" className="w-1/2">
            <Button variant="outline" size="xs" className="w-full">
              <IconBrandGithubFilled size={12} className="mr-1.5" /> GitHub
            </Button>
          </Link>
        )}
        {url && (
          <Link href={url} target="_blank" rel="noreferrer" className="w-1/2">
            <Button variant="outline" size="xs" className="w-full">
              <IconExternalLink size={12} className="mr-1.5" />
              Demo
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
};

export const Ecosystem = () => {
  const [cards, setCards] = React.useState(shuffle(CONTENT.cards).slice(0, 6));
  const targetRef = React.useRef(null);
  const { scrollYProgress: fadeInAnimationProgress } = useScroll({
    target: targetRef,
    offset: ["50% end", "end start"],
  });
  const { scrollYProgress: fadeOutAnimationProgress } = useScroll({
    target: targetRef,
    offset: ["50% start", "250% start"],
  });

  const isInView = useInView(targetRef, {
    amount: 0.7,
  });
  const blobOpacityFadeIn = useTransform(fadeInAnimationProgress, [0, 1], [0, 0.8]);
  const blobOpacityFadeOut = useTransform(fadeOutAnimationProgress, [0, 1], [1, 0]);

  const [isLooping, setIsLooping] = React.useState(false);

  const loopDuration = 3500; // Duration of each loop
  const fadeOutDuration = 1000; // Duration of the fade-out animation

  const containerVariants = {
    hidden: {
      transition: {
        staggerChildren: 0.15,
        staggerDirection: -1, // Stagger in reverse for hiding
      },
    },
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const fadeVariants = {
    hidden: { opacity: 0, y: 10, transition: { duration: 0.5 } },
    visible: { opacity: 0.75, y: 0, transition: { duration: 0.5 } },
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let timeout: NodeJS.Timeout | undefined;

    if (isInView) {
      setIsLooping(true);
      interval = setInterval(() => {
        // Start fade-out animation
        setIsLooping(false);

        // Wait for fade-out to complete before changing cards
        timeout = setTimeout(() => {
          setCards(shuffle(CONTENT.cards).slice(0, 6));
          setIsLooping(true);
        }, fadeOutDuration * 1.5);
      }, loopDuration + fadeOutDuration);
    } else {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
      setIsLooping(false);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [isInView]);

  return (
    <>
      <div
        ref={targetRef}
        className="relative z-10 container max-w-8xl flex flex-col-reverse items-center gap-16 justify-between py-16 lg:py-24 lg:flex-row"
        id="ecosystem"
      >
        <motion.div
          className="relative z-10 grid grid-cols-2 gap-4 w-full lg:grid-cols-3 lg:gap-8"
          initial="hidden"
          animate={isLooping ? "visible" : "hidden"}
          variants={containerVariants}
        >
          {cards.map((card, index) => (
            <motion.div key={index} variants={fadeVariants}>
              <EcoCard {...card} />
            </motion.div>
          ))}
        </motion.div>
        <div className="space-y-6 max-w-sm relative z-10 shrink-0">
          <h3 className="text-4xl font-medium">{CONTENT.heading}</h3>
          <p className="text-muted-foreground">{CONTENT.body}</p>
          <Link className="inline-block" href="https://app.marginfi.com/ecosystem">
            <Button>
              View Ecosystem <IconArrowRight size={18} className="ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
      <motion.div className="fixed z-0 bottom-0 left-1/2 -translate-x-1/2" style={{ opacity: blobOpacityFadeOut }}>
        <motion.svg
          width="1251"
          height="785"
          viewBox="0 0 1251 785"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: blobOpacityFadeIn }}
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
        </motion.svg>
      </motion.div>
    </>
  );
};
