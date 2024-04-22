import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/", "/index", "/stake", "/swap", "/bridge", "/earn", "/points", "/api/rpc"],
};

const allowedOrigins = [
  "https://www.mfi.gg",
  "https://app.marginfi.com",
  "https://marginfi-v2-ui-git-staging-mrgn.vercel.app",
  "http://localhost:3004",
];

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/rpc")) {
    // Check the origin from the request
    const origin = req.headers.get("origin") ?? "";
    const isAllowedOrigin = allowedOrigins.includes(origin);

    if (!allowedOrigins.includes(origin)) {
      return new Response("Access Denied", {
        status: 403,
        statusText: "Forbidden",
      });
    }

    // Handle simple requests
    return NextResponse.rewrite(new URL(process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE_REROUTE ?? ""));
  } else {
    const basicAuth = req.headers.get("authorization");
    const url = req.nextUrl;
    const response = NextResponse.next();
    // response.headers.set('Vercel-CDN-Cache-Control', 'private, max-age=10');
    // response.headers.set('CDN-Cache-Control', 'private, max-age=10');
    // response.headers.set('Cache-Control', 'private, max-age=10');

    if (process.env.AUTHENTICATION_DISABLED === "true") {
      return response;
    }

    if (basicAuth) {
      const authValue = basicAuth.split(" ")[1];
      const [providedUser, providedPassword] = atob(authValue).split(":");

      const expectedUser = process.env.AUTHENTICATION_USERNAME || "admin";
      const expectedPassword = process.env.AUTHENTICATION_PASSWORD || "admin";

      if (providedUser === expectedUser && providedPassword === expectedPassword) {
        return response;
      }
    }
    url.pathname = "/api/auth";

    return NextResponse.rewrite(url);
  }
}
