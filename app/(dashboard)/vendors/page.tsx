import { Suspense } from "react";
import { db } from "@/lib/db";
import VendorsClient from "./VendorsClient";

interface VendorsPageProps {
  searchParams: {
    compliance_status?: string;
    page?: string;
    search?: string;
  };
}

async function getVendors(complianceStatus?: string, search?: string) {
  const client = await db.connect();
  try {
    let query = `
      SELECT
        id,
        name,
        contact_email,
        contact_name,
        compliance_status,
        risk_level,
        category,
        created_at,
        updated_at
      FROM vendors
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (complianceStatus && complianceStatus !== "all") {
      query += ` AND compliance_status = $${paramIndex}`;
      params.push(complianceStatus);
      paramIndex++;
    }

    if (search && search.trim() !== "") {
      query += ` AND (name ILIKE $${paramIndex} OR contact_email ILIKE $${paramIndex} OR contact_name ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const { compliance_status, search } = searchParams;

  const vendors = await getVendors(compliance_status, search);

  const serializedVendors = vendors.map((vendor) => ({
    id: String(vendor.id),
    name: vendor.name ?? "",
    contact_email: vendor.contact_email ?? "",
    contact_name: vendor.contact_name ?? "",
    compliance_status: vendor.compliance_status ?? "unknown",
    risk_level: vendor.risk_level ?? "unknown",
    category: vendor.category ?? "",
    created_at: vendor.created_at
      ? new Date(vendor.created_at).toISOString()
      : null,
    updated_at: vendor.updated_at
      ? new Date(vendor.updated_at).toISOString()
      : null,
  }));

  return (
    <Suspense
      fallback={<div className="p-8 text-center">Loading vendors...</div>}
    >
      <VendorsClient
        vendors={serializedVendors}
        currentComplianceStatus={compliance_status ?? "all"}
        currentSearch={search ?? ""}
      />
    </Suspense>
  );
}
