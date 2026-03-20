"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session, status } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        <Link
          href="/dashboard"
          className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/vendors"
          className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
        >
          Vendors
        </Link>
        <Link
          href="/certificates"
          className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
        >
          Certificates
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {status === "authenticated" && session?.user?.email && (
          <>
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded transition-colors"
            >
              Sign Out
            </button>
          </>
        )}
        {status === "unauthenticated" && (
          <Link
            href="/login"
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors"
          >
            Sign In
          </Link>
        )}
        {status === "loading" && (
          <span className="text-sm text-gray-400">Loading...</span>
        )}
      </div>
    </nav>
  );
}
