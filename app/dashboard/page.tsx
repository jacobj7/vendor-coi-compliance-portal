import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export interface Vendor {
  id: string;
  name: string;
  email: string;
  compliance_status: string;
  last_updated: string | null;
  risk_score: number | null;
}

async function getVendors(): Promise<Vendor[]> {
  const result = await db.query(`
    SELECT
      id::text,
      name,
      email,
      compliance_status,
      last_updated::text,
      risk_score
    FROM vendors
    ORDER BY name ASC
  `);
  return result.rows as Vendor[];
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const vendors = await getVendors();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Compliance Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and monitor vendor compliance status
          </p>
        </div>
        <DashboardClient vendors={vendors} />
      </div>
    </main>
  );
}
