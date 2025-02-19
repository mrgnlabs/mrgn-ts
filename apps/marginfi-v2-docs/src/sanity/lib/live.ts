// src/sanity/lib/live.ts

import { defineLive } from "next-sanity";
import { client } from "@/sanity/lib/client";
import { token } from "@/sanity/lib/token";

export const { sanityFetch, SanityLive } = defineLive({
  client: client.withConfig({apiVersion: "vX"}),
  browserToken: token,
  serverToken: token,
});