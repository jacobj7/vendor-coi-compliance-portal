import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/submit/") ||
          pathname.startsWith("/api/auth/") ||
          (pathname === "/api/submissions" && req.method === "POST")
        ) {
          return true;
        }

        if (pathname.startsWith("/dashboard")) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/submit/:path*",
    "/api/submissions",
    "/api/auth/:path*",
  ],
};
