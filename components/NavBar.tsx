"use client";

import { useSession, signOut } from "next-auth/react";

export default function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-indigo-600 tracking-tight">
          MyApp
        </span>
      </div>

      <div className="flex items-center gap-4">
        {session?.user?.email && (
          <span className="text-sm text-gray-600 hidden sm:block">
            {session.user.email}
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 px-4 py-2 rounded-md transition-colors duration-150"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
