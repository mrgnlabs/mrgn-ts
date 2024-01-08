import Link from "next/link";
import Image from "next/image";

import { PageHeader } from "~/components/common/PageHeader";

import { IconExternalLink, IconBrandGithubFilled } from "~/components/ui/icons";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

const projects = [
  {
    title: "marginfi v2",
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
    title: "marginfi liquidator",
    github: "https://github.com/mrgnlabs/mrgn-ts/tree/main/apps/alpha-liquidator",
    repo: "mrgnlabs/mrgn-ts",
    author: {
      name: "marginfi",
      avatar: "/mrgn_logo_192.png",
      url: "https://marginfi.com",
    },
  },
  {
    title: "account search",
    url: "https://mrgn-account-search.vercel.app/",
    github: "https://github.com/mrgnlabs/community-examples",
    repo: "mrgnlabs/community-examples",
    author: {
      name: "chambaz",
      avatar: "https://pbs.twimg.com/profile_images/1689607468035215360/E5jbjK2q_400x400.jpg",
      url: "https://twitter.com/chambaz",
    },
  },
  {
    title: "health check",
    url: "https://marginfi-borrow-caps.vercel.app/health",
    github: "https://github.com/mrgnlabs/community-examples",
    repo: "mrgnlabs/community-examples",
    author: {
      name: "0xCosmic",
      avatar: "https://pbs.twimg.com/profile_images/1720548857904291840/TSUNn3BC_400x400.jpg",
      url: "https://twitter.com/0xCosmic_",
    },
  },
  {
    title: "borrow caps",
    url: "https://marginfi-borrow-caps.vercel.app/",
    github: "https://github.com/mrgnlabs/community-examples",
    repo: "mrgnlabs/community-examples",
    author: {
      name: "0xCosmic",
      avatar: "https://pbs.twimg.com/profile_images/1720548857904291840/TSUNn3BC_400x400.jpg",
      url: "https://twitter.com/0xCosmic_",
    },
  },
];

export default function Ecosystem() {
  return (
    <>
      <PageHeader>Ecosystem</PageHeader>
      <div className="w-full xl:w-4/5 xl:max-w-7xl mx-auto px-4">
        <div className="text-muted-foreground text-lg text-center my-12">
          <p>Official and community projects powered by the marginfi SDK.</p>
          <p>
            Code can be found in the{" "}
            <Link
              href="#"
              className="inline-flex items-center gap-1 text-chartreuse border-b border-transparent transition-colors hover:border-chartreuse"
            >
              community examples repo <IconExternalLink size={15} />
            </Link>
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-4 lg:gap-8 w-full">
          {projects.map((project) => (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="font-medium text-lg">{project.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={project.author.url} className="flex items-center gap-2">
                  <Image
                    src={project.author.avatar}
                    alt={project.author.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  {project.author.name}
                </Link>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Link href={project.github} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full">
                    <IconBrandGithubFilled size={16} /> GitHub
                  </Button>
                </Link>
                {project.url && (
                  <Link href={project.url} target="_blank" rel="noreferrer">
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
