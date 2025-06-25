import Link from "next/link";
import Image from "next/image";

import shuffle from "lodash.shuffle";

import { cn } from "@mrgnlabs/mrgn-utils";

import {
  IconExternalLink,
  IconBrandGithubFilled,
  IconBrandDiscordFilled,
  IconBrandX,
  IconChartHistogram,
} from "@tabler/icons-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PageHeading } from "~/components/common/PageHeading";

const projects = shuffle([
  {
    title: "Exponent",
    description: "Trade volatile marginfi pool yields and earn fixed-rates for $USDC, $PYUSD and $USDT.",
    url: "https://www.exponent.finance",
    author: {
      name: "Exponent",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/exponent.jpg",
      url: "https://www.exponent.finance",
    },
  },
  {
    title: "Carrot",
    description:
      "Carrot is building an auto-adjusting yield bearing token and using marginfi to rebalance user deposits.",
    url: "https://deficarrot.com/",
    author: {
      name: "Carrot",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/carrot.jpg",
      url: "https://deficarrot.com/",
    },
  },
  {
    title: "Mantis SVM",
    description: "The first Solana L2, using marginfi to giver users lending yield + staking yield + re-staking yield.",
    url: "https://www.mantis.app/",
    author: {
      name: "Mantis",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/mantis.png",
      url: "https://www.mantis.app/",
    },
  },
  {
    title: "The Arena",
    description: "Memecoin trading, with leverage",
    url: "https://www.thearena.trade",
    github: "https://github.com/mrgnlabs/mrgn-ts/tree/main/apps/marginfi-v2-trading",
    repo: "mrgnlabs/mrgn-ts",
    author: {
      name: "marginfi",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/mrgn_logo_192.png",
      url: "https://marginfi.com",
    },
  },
  {
    title: "Juicer",
    description: "Juicer is building on marginfi to give their users exposure to competitive lending rates.",
    url: "https://beta.juicer.fi/borrow-lend",
    author: {
      name: "juicerfi",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/juicerfi.jpg",
      url: "https://twitter.com/juicerfi",
    },
  },
  {
    title: "DreamOS",
    description: "The operating system for web3",
    url: "https://www.dreamos.app/",
    author: {
      name: "DreamOS",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/dreamOS.jpg",
      url: "https://twitter.com/theDreamOS",
    },
  },
  {
    title: "Fluxbeam",
    description:
      "Solana's premier Telegram trading bot is using marginfi to give their users access to liquidity for their trading strategies.",
    url: "https://fluxbot.xyz/",
    author: {
      name: "FluxBeam",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/fluxbot.jpg",
      url: "https://twitter.com/FluxBeamDEX",
    },
  },
  {
    title: "Asgard Watch Bot",
    description: "Get real-time Telegram alerts for your DeFi positions and protect your collateral!",
    url: "https://t.me/AsgardWatchBot",
    author: {
      name: "Asgard",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/asgardwatchbot.jpg",
      url: "https://twitter.com/asgardfi",
    },
  },
  {
    title: "Bags",
    description: "Coming soon...",
    url: "https://bags.fm",
    author: {
      name: "Bags",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/bags.webp",
    },
  },
  {
    title: "Hampter",
    description: "Squeeze me, im fluff $HMTR on $SOL",
    url: "https://www.hampterfi.com/",
    author: {
      name: "Hampter",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/hampter.jpg",
    },
  },
  {
    title: "Splitwave",
    description: "Your all things money on Solana!",
    url: "https://splitwave.app/",
    author: {
      name: "Splitwave",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/splitwave.jpg",
    },
  },
  {
    title: "Meteora",
    description: "Building the most dynamic liquidity protocols in DeFi. Powered by Solana!",
    url: "https://www.meteora.ag/",
    author: {
      name: "Meteora",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/meteora.jpg",
    },
  },
  {
    title: "AssetDash",
    description: "The best portfolio tracker and rewards program in crypto",
    url: "https://www.assetdash.com/",
    author: {
      name: "AssetDash",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/assetdash.jpg",
    },
  },
  {
    title: "Pulsar Finance",
    description: "The Most Complete Portfolio Manager In Crypto",
    url: "https://app.pulsar.finance/",
    author: {
      name: "Pulsar Finance",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/pulsar.jpg",
    },
  },
  {
    title: "Squads",
    description: "Smart account standard for SVM. Multisig, account abstraction and beyond",
    url: "https://squads.so/",
    author: {
      name: "Squads",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/squads.jpg",
    },
  },
]);

const headerLinks = [
  { href: "https://discord.gg/pJ3U7gHJFe", icon: <IconBrandDiscordFilled size={20} /> },
  { href: "https://twitter.com/marginfi", icon: <IconBrandX size={20} /> },
  { href: "https://github.com/mrgnlabs", icon: <IconBrandGithubFilled size={20} /> },
];

export default function Ecosystem() {
  return (
    <>
      <div className="w-full xl:w-4/5 xl:max-w-7xl mx-auto px-4">
        <PageHeading
          heading={<span className="text-4xl font-medium text-primary">Ecosystem</span>}
          body={
            <p>
              Production applications, powered by marginfi. <br className="hidden lg:block" />
              <Link
                href="https://docs.marginfi.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-chartreuse border-b border-transparent transition-colors hover:border-chartreuse"
              >
                View the docs
                <IconExternalLink size={15} />
              </Link>{" "}
              for SDKs, examples, and more.
            </p>
          }
          links={headerLinks}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-4 lg:gap-8 w-full pb-24">
          {projects.map((project, index) => (
            <Card variant="default" className="w-full" key={index}>
              <CardHeader>
                <CardTitle className="font-medium text-lg">{project.title}</CardTitle>
                {project.description && <CardDescription>{project.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Link
                  href={project.author.url || ""}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 text-white transition-colors hover:text-chartreuse font-medium text-sm",
                    !project.author.url && "pointer-events-none"
                  )}
                >
                  <Image
                    src={project.author.avatar}
                    alt={project.author.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  {project.author.name}
                </Link>
              </CardContent>
              <CardFooter className="flex gap-3 justify-between">
                {project.github && (
                  <Link href={project.github} target="_blank" rel="noreferrer" className="w-1/2">
                    <Button variant="outline-dark" className="w-full">
                      <IconBrandGithubFilled size={16} /> GitHub
                    </Button>
                  </Link>
                )}
                {project.url && (
                  <Link href={project.url} target="_blank" rel="noreferrer" className="w-1/2">
                    <Button variant="outline-dark" className="w-full">
                      <IconExternalLink size={16} />
                      Demo
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
