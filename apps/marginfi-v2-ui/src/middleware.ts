import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/", "/index", "/stake", "/swap", "/bridge", "/earn", "/points"],
};

const restrictedCountries = ["VE", "CU", "IR", "KP", "SY"];

const leverageRestrictedCountries = ["US"];
const restrictedRoute = "/looper";

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get("authorization");
  const url = req.nextUrl;
  const response = NextResponse.next();
  // response.headers.set('Vercel-CDN-Cache-Control', 'private, max-age=10');
  // response.headers.set('CDN-Cache-Control', 'private, max-age=10');
  // response.headers.set('Cache-Control', 'private, max-age=10');

  const country = req.geo?.country;

  console.log(country, req.nextUrl.pathname, restrictedRoute);

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
