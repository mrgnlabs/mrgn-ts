import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/", "/index", "/yield", "/portfolio", "/trade/:path*", "/api/rpc"],
};

const restrictedCountries = ["US", "VE", "CU", "IR", "KP", "SY"];

const allowedOrigins = ["https://www.thearena.trade", "https://staging.thearena.trade", "http://localhost:3006"];

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/rpc")) {
    const origin = req.headers.get("origin") ?? "";

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

    if (
      !process.env.GEOBLOCK_DISABLED &&
      req.geo &&
      req.geo.country &&
      restrictedCountries.includes(req.geo.country) &&
      !req.nextUrl.pathname.startsWith("/blocked")
    ) {
      return NextResponse.redirect("https://www.thearena.trade/blocked");
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
