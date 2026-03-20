"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link
          href="/dashboard"
          className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/vendors"
          className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
        >
          Vendors
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {session?.user?.email && (
          <span className="text-sm text-gray-500">{session.user.email}</span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
