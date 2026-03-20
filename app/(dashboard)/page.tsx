import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import DashboardClient from "./DashboardClient";

interface ComplianceStatusCounts {
  compliant: number;
  non_compliant: number;
  pending: number;
  under_review: number;
}

interface RecentVendor {
  id: string;
  name: string;
  compliance_status: string;
  risk_level: string;
  created_at: string;
  updated_at: string;
}

async function getComplianceStatusCounts(): Promise<ComplianceStatusCounts> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN compliance_status = 'compliant' THEN 1 ELSE 0 END), 0)::int AS compliant,
        COALESCE(SUM(CASE WHEN compliance_status = 'non_compliant' THEN 1 ELSE 0 END), 0)::int AS non_compliant,
        COALESCE(SUM(CASE WHEN compliance_status = 'pending' THEN 1 ELSE 0 END), 0)::int AS pending,
        COALESCE(SUM(CASE WHEN compliance_status = 'under_review' THEN 1 ELSE 0 END), 0)::int AS under_review
      FROM vendors
    `);
    return result.rows[0] as ComplianceStatusCounts;
  } finally {
    client.release();
  }
}

async function getRecentVendors(): Promise<RecentVendor[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        id::text,
        name,
        compliance_status,
        risk_level,
        created_at::text,
        updated_at::text
      FROM vendors
      ORDER BY created_at DESC
      LIMIT 10
    `);
    return result.rows as RecentVendor[];
  } finally {
    client.release();
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const [complianceStatusCounts, recentVendors] = await Promise.all([
    getComplianceStatusCounts(),
    getRecentVendors(),
  ]);

  const serializedCounts = {
    compliant: complianceStatusCounts.compliant,
    non_compliant: complianceStatusCounts.non_compliant,
    pending: complianceStatusCounts.pending,
    under_review: complianceStatusCounts.under_review,
  };

  const serializedVendors = recentVendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    compliance_status: vendor.compliance_status,
    risk_level: vendor.risk_level,
    created_at: vendor.created_at,
    updated_at: vendor.updated_at,
  }));

  return (
    <DashboardClient
      complianceStatusCounts={serializedCounts}
      recentVendors={serializedVendors}
      userEmail={session.user?.email ?? ""}
      userName={session.user?.name ?? ""}
    />
  );
}
