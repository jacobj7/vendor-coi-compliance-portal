import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import VendorsClient from "./VendorsClient";

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  compliance_status: "compliant" | "non_compliant" | "pending" | "unknown";
  compliance_score: number | null;
  last_audit_date: string | null;
  created_at: string;
  updated_at: string;
}

async function getVendors(): Promise<Vendor[]> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/vendors`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch vendors:", response.statusText);
      return [];
    }

    const data = await response.json();
    return data.vendors || [];
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return [];
  }
}

export default async function VendorsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const vendors = await getVendors();

  const serializedVendors = vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone ?? null,
    address: vendor.address ?? null,
    compliance_status: vendor.compliance_status,
    compliance_score: vendor.compliance_score ?? null,
    last_audit_date: vendor.last_audit_date ?? null,
    created_at: vendor.created_at,
    updated_at: vendor.updated_at,
  }));

  return <VendorsClient vendors={serializedVendors} />;
}
