import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/", "/index"],
};

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get("authorization");
  const url = req.nextUrl;
  const passwordEnabled = (process.env.PASSWORD_ENABLED || "true") === "true";

  if (!passwordEnabled) {
    return NextResponse.next();
  }

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [providedUser, providedPassword] = atob(authValue).split(":");

    const expextedUser = process.env.PASSWORD_USERNAME || "admin";
    const expectedPwd = process.env.PASSWORD_PASSWORD || "admin";

    if (providedUser === expextedUser && providedPassword === expectedPwd) {
      return NextResponse.next();
    }
  }
  url.pathname = "/api/auth";

  return NextResponse.rewrite(url);
}
