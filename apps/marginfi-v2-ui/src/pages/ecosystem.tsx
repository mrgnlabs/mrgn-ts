import Link from "next/link";
import Image from "next/image";

import shuffle from "lodash/shuffle";

import { cn } from "~/utils";

import {
  IconExternalLink,
  IconBrandGithubFilled,
  IconBrandDiscordFilled,
  IconBrandX,
  IconChartHistogram,
} from "~/components/ui/icons";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PageHeading } from "~/components/common/PageHeading";

const projects = shuffle([
  {
    title: "WRTHY",
    description: "On-chain credit systems",
    url: "https://trustless.engineering",
    author: {
      name: "WRTHY",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/wrthy.png",
      url: "https://trustless.engineering",
    },
  },
  {
    title: "Carrot",
    description: "Auto-adjusting yield bearing token",
    url: "https://deficarrot.com/",
    author: {
      name: "Carrot",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/carrot.jpg",
      url: "https://deficarrot.com/",
    },
  },
  {
    title: "Mantis SVM",
    description: "The first Solana L2 with native yield",
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
    title: "marginfi v2",
    description: "V2 of the marginfi protocol",
    url: "https://app.marginfi.com",
    github: "https://github.com/mrgnlabs/marginfi-v2",
    repo: "mrgnlabs/marginfi-v2",
    author: {
      name: "marginfi",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/mrgn_logo_192.png",
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
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/mrgn_logo_192.png",
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
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/mrgn_logo_192.png",
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
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/mrgn_logo_192.png",
      url: "https://marginfi.com",
    },
  },
  {
    title: "dune analytics",
    description: "MarginFi Dune Analytics dashboard",
    url: "https://dune.com/man0s/marginfi/",
    author: {
      name: "man0s",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/manos.jpg",
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
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/chambaz.jpg",
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
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/cosmic.jpg",
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
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/cosmic.jpg",
      url: "https://twitter.com/0xCosmic_",
    },
  },
  {
    title: "Juicer",
    description: "Discover yield opportunities on Solana",
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
    title: "Fluxbot",
    description: "Solana's #1 Telegram Trading Bot",
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
      url: "https://twitter.com/asgardfi"
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
    title: "Step Finance",
    description: "Portfolio Dashboard & Analytics for Solana",
    url: "https://www.step.finance/",
    author: {
      name: "Step Finance",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/step.jpg",
    },
  },
  {
    title: "SonarWatch",
    description: "Empowering your journey on web3 with a powerful tracking tool, multichain and open-source",
    url: "https://sonar.watch/",
    author: {
      name: "SonarWatch",
      avatar: "https://storage.googleapis.com/mrgn-public/ecosystem-images/sonar.jpg",
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
  { href: "https://discord.gg/mrgn", icon: <IconBrandDiscordFilled size={20} /> },
  { href: "https://twitter.com/marginfi", icon: <IconBrandX size={20} /> },
  { href: "https://github.com/mrgnlabs", icon: <IconBrandGithubFilled size={20} /> },
  {
    href: "https://mrgn.grafana.net/public-dashboards/a2700f1bbca64aeaa5582a90dbaeb276?orgId=1&refresh=1m",
    icon: <IconChartHistogram size={20} />,
  },
];

export default function Ecosystem() {
  return (
    <>
      <div className="w-full xl:w-4/5 xl:max-w-7xl mx-auto px-4">
        <PageHeading
          heading={<span className="text-4xl font-medium text-primary">Ecosystem</span>}
          body={
            <p>
              Official and community projects powered by the marginfi SDK. <br className="hidden lg:block" />
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
                    <Button variant="outline" className="w-full">
                      <IconBrandGithubFilled size={16} /> GitHub
                    </Button>
                  </Link>
                )}
                {project.url && (
                  <Link href={project.url} target="_blank" rel="noreferrer" className="w-1/2">
                    <Button variant="outline" className="w-full">
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
