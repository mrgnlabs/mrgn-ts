import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/", "/index"],
};

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get("authorization");
  const url = req.nextUrl;

  if (process.env.PASSWORD_DISABLED) {
    return NextResponse.next();
  }

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [providedUser, providedPassword] = atob(authValue).split(":");

    const expextedUser = process.env.PASSWORD_USERNAME || "admin";
    const expectedPassword = process.env.PASSWORD_PASSWORD || "admin";

    if (
      providedUser === expextedUser &&
      providedPassword === expectedPassword
    ) {
      return NextResponse.next();
    }
  }
  url.pathname = "/api/auth";

  return NextResponse.rewrite(url);
}
