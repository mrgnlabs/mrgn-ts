// src/app/api/draft-mode/enable/route.ts

import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { client } from "@/sanity/lib/client";
import { token } from "@/sanity/lib/token"

export const { GET } = defineEnableDraftMode({
    client: client.withConfig({ token }),
});