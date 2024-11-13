import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/", "/index", "/stake", "/swap", "/bridge", "/earn", "/points", "/looper", "/api/rpc"],
};

const restrictedCountries = ["VE", "CU", "IR", "KP", "SY"];
const leverageRestrictedCountries = ["US"];
const restrictedRoute = "/looper";

const allowedOrigins = [
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
    const country = req.geo?.country;

    if (country && restrictedCountries.includes(country)) {
      return NextResponse.redirect("https://www.marginfi.com");
    }

    if (req.nextUrl.pathname.startsWith(restrictedRoute) && country && leverageRestrictedCountries.includes(country)) {
      return NextResponse.redirect(new URL("/not-allowed", req.url));
    }

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
