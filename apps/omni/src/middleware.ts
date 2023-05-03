import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/", "/index"],
};

export function middleware(req: NextRequest) {
  // const basicAuth = req.headers.get("authorization");
  // const url = req.nextUrl;
  // if (process.env.AUTHENTICATION_DISABLED === "true") {
  //   return NextResponse.next();
  // }
  // if (basicAuth) {
  //   const authValue = basicAuth.split(" ")[1];
  //   const [providedUser, providedPassword] = atob(authValue).split(":");
  //   const expectedUser = process.env.AUTHENTICATION_USERNAME || "admin";
  //   const expectedPassword = process.env.AUTHENTICATION_PASSWORD || "admin";
  //   if (providedUser === expectedUser && providedPassword === expectedPassword) {
  //     return NextResponse.next();
  //   }
  // }
  // url.pathname = "/api/auth";
  // return NextResponse.rewrite(url);
}
