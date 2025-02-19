// app/(blog)/posts/[slug]/page.tsx

import { QueryParams } from "next-sanity";
import { notFound } from "next/navigation";

import { POSTS_QUERY, POST_QUERY } from "@/sanity/lib/queries";

import { client } from "@/sanity/lib/client";
import { sanityFetch } from "@/sanity/lib/live";
import { Post } from "@/components/Post";

export async function generateStaticParams() {
    const posts = await client.fetch(POSTS_QUERY);

    return posts.map((post) => ({
        slug: post?.slug?.current,
    }));
}

export default async function Page({
                                       params,
                                   }: {
    params: Promise<QueryParams>;
}) {
    const { data: post } = await sanityFetch({
        query: POST_QUERY,
        params: await params,
    });
    if (!post) {
        return notFound();
    }
    return <Post post={post} />;
}