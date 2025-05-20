import { NextRequest, NextResponse } from "next/server";
import { generateEndpoint } from "~/rpc.utils";

export const config = {
  matcher: ["/", "/index", "/stake", "/swap", "/bridge", "/earn", "/points", "/looper", "/api/proxy/:path*"],
};

const restrictedCountries = ["VE", "CU", "IR", "KP", "SY"];
const leverageRestrictedCountries = ["US"];
const restrictedRoute = "/looper";

const allowedOrigins = [
  "https://app.marginfi.com",
  "https://marginfi-v2-ui-git-staging-mrgn.vercel.app",
  "https://marginfi-v2-ui-git-staging2-mrgn.vercel.app",
  "https://marginfi-v2-ui-git-test-mrgn.vercel.app",
  "http://localhost:3004",
];

export async function middleware(req: NextRequest) {
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

    // Handle simple requests
    return NextResponse.rewrite(new URL(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE ?? ""));
  } else {
    const basicAuth = req.headers.get("authorization");
    const url = req.nextUrl;
    const response = NextResponse.next();
    const country = req.geo?.country;

    if (country && restrictedCountries.includes(country)) {
      return NextResponse.redirect("https://www.marginfi.com");
    }

    if (req.nextUrl.pathname.startsWith(restrictedRoute) && country && leverageRestrictedCountries.includes(country)) {
      return NextResponse.redirect(new URL("/not-allowed", req.url));
    }

    return response;
  }
}
