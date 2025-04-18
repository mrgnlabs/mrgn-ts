import { NextRequest, NextResponse } from "next/server";
import { generateEndpoint } from "~/rpc.utils";

const allowedOrigins = [
  "https://www.marginfi.com",
  "https://marginfi-landing-page-v2.vercel.app",
  "http://localhost:3005",
];

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/wolf") {
    return NextResponse.redirect(new URL("/?utm_source=wolf&utm_medium=direct&utm_campaign=testing", req.url));
  }

  const fullRpcProxy = await generateEndpoint(
    process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE ?? "",
    process.env.NEXT_PUBLIC_RPC_PROXY_KEY ?? ""
  );

  if (req.nextUrl.toString() === fullRpcProxy) {
    const origin = req.headers.get("origin") ?? "";

    if (!allowedOrigins.includes(origin)) {
      return new Response("Access Denied", {
        status: 403,
        statusText: "Forbidden",
      });
    }

    return NextResponse.rewrite(new URL(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE ?? ""));
  }
}
