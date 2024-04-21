import { NextRequest, NextResponse } from "next/server";

const allowedOrigins = ["https://www.mfi.gg", "https://app.marginfi.com"];

const corsOptions = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function middleware(request: NextRequest) {
  // Check the origin from the request
  const origin = request.headers.get("origin") ?? "";
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Handle preflighted requests
  const isPreflight = request.method === "OPTIONS";

  if (isPreflight) {
    const preflightHeaders = {
      ...(isAllowedOrigin && { "Access-Control-Allow-Origin": origin }),
      ...corsOptions,
    };
    return NextResponse.json({}, { headers: preflightHeaders });
  }

  const upgradeHeader = request.headers.get("Upgrade");

  if (upgradeHeader || upgradeHeader === "websocket") {
    //return TODO
  }

  const payload = await request.text();
  const proxyRequest = new NextRequest(`${process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE_REROUTE}`, {
    method: request.method,
    body: payload || null,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await fetch(proxyRequest).then((res) => {
    // Handle simple requests
    const response = new NextResponse(res.body, { status: res.status });

    if (isAllowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    Object.entries(corsOptions).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  });
}
