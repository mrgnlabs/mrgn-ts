import Link from "next/link";
import Image from "next/image";

import { cn } from "~/utils";

import { PageHeader } from "~/components/common/PageHeader";
import {
  IconExternalLink,
  IconBrandGithubFilled,
  IconBrandDiscordFilled,
  IconBrandX,
  IconChartHistogram,
} from "~/components/ui/icons";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

const projects = [
  {
    title: "marginfi v2",
    description: "V2 of the marginfi protocol",
    url: "https://app.marginfi.com",
    github: "https://github.com/mrgnlabs/marginfi-v2",
    repo: "mrgnlabs/marginfi-v2",
    author: {
      name: "marginfi",
      avatar: "/mrgn_logo_192.png",
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
      avatar: "/mrgn_logo_192.png",
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
      avatar: "/mrgn_logo_192.png",
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
      avatar: "/mrgn_logo_192.png",
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
      avatar: "/mrgn_logo_192.png",
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
      avatar: "https://pbs.twimg.com/profile_images/1744141051583926272/yULkMCFf_400x400.png",
      url: "https://twitter.com/juicerfi",
    },
  },
  {
    title: "DreamOS",
    description: "The operating system for web3",
    url: "https://www.dreamos.app/",
    author: {
      name: "DreamOS",
      avatar: "https://pbs.twimg.com/profile_images/1728866739381837824/zLICMwN9_400x400.jpg",
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
    title: "Hiemdall",
    description: "Account monitoring bot for Telegram",
    url: "https://t.me/HeimdallWatchBot",
    author: {
      name: "Hiemdall",
      avatar: "/hiemdall.jpg",
    },
  },
];

export default function Ecosystem() {
  return (
    <>
      <PageHeader>ecosystem</PageHeader>
      <div className="w-full xl:w-4/5 xl:max-w-7xl mx-auto px-4">
        <div className="text-muted-foreground text-lg text-center my-12">
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

          <ul className="flex items-center gap-4 justify-center mt-4">
            <li>
              <Link
                href="https://discord.gg/mrgn"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-chartreuse"
              >
                <IconBrandDiscordFilled />
              </Link>
            </li>
            <li>
              <Link
                href="https://twitter.com/marginfi"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-chartreuse"
              >
                <IconBrandX />
              </Link>
            </li>
            <li>
              <Link
                href="https://github.com/mrgnlabs"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-chartreuse"
              >
                <IconBrandGithubFilled />
              </Link>
            </li>
            <li>
              <Link
                href="https://mrgn.grafana.net/public-dashboards/a2700f1bbca64aeaa5582a90dbaeb276?orgId=1&refresh=1m"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-chartreuse"
              >
                <IconChartHistogram />
              </Link>
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-4 lg:gap-8 w-full pb-20">
          {projects.map((project, index) => (
            <Card className="w-full bg-muted border border-muted-foreground/10" key={index}>
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
