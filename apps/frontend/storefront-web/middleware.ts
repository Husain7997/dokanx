import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { resolveTenantFromHostname } from "@dokanx/utils";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || request.nextUrl.hostname;
  const tenant = resolveTenantFromHostname(hostname);
  const requestHeaders = new Headers(request.headers);

  if (tenant.tenantKey) {
    requestHeaders.set("x-tenant-key", tenant.tenantKey);
    requestHeaders.set("x-tenant-mode", tenant.mode);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
