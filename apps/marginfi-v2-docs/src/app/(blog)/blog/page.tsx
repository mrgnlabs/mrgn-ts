// src/app/(blog)/page.tsx

import { Posts } from "@/components/Posts";
import { sanityFetch } from "@/sanity/lib/live";
import { POSTS_QUERY } from "@/sanity/lib/queries";

export default async function Page() {
    const { data: posts } = await sanityFetch({
        query: POSTS_QUERY,
    });

    return <Posts posts={posts} />;
}