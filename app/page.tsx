import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Welcome to the App
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A powerful platform to help you get things done. Sign in to your
            account or create a new one to get started.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 text-lg"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3 bg-transparent border-2 border-slate-400 hover:border-white text-slate-300 hover:text-white font-semibold rounded-lg transition-colors duration-200 text-lg"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          <div className="bg-slate-800 bg-opacity-50 rounded-xl p-6 border border-slate-700">
            <div className="text-blue-400 text-2xl mb-3">⚡</div>
            <h3 className="text-white font-semibold text-lg mb-2">Fast</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Built with modern technologies for blazing fast performance.
            </p>
          </div>
          <div className="bg-slate-800 bg-opacity-50 rounded-xl p-6 border border-slate-700">
            <div className="text-green-400 text-2xl mb-3">🔒</div>
            <h3 className="text-white font-semibold text-lg mb-2">Secure</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your data is protected with industry-standard security practices.
            </p>
          </div>
          <div className="bg-slate-800 bg-opacity-50 rounded-xl p-6 border border-slate-700">
            <div className="text-purple-400 text-2xl mb-3">🚀</div>
            <h3 className="text-white font-semibold text-lg mb-2">Scalable</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Designed to grow with your needs, from day one to day one million.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
