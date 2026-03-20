import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import VendorDetailClient from "./VendorDetailClient";

export default async function VendorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const vendorResult = await pool.query(
    `SELECT v.*, vc.name as category_name
     FROM vendors v
     LEFT JOIN vendor_categories vc ON v.category_id = vc.id
     WHERE v.id = $1`,
    [params.id],
  );

  if (vendorResult.rows.length === 0) {
    redirect("/dashboard/vendors");
  }

  const vendor = vendorResult.rows[0];

  const submissionsResult = await pool.query(
    `SELECT s.*, u.email as reviewer_email
     FROM submissions s
     LEFT JOIN users u ON s.reviewed_by = u.id
     WHERE s.vendor_id = $1
     ORDER BY s.created_at DESC`,
    [params.id],
  );

  const submissions = submissionsResult.rows;

  return (
    <VendorDetailClient
      vendor={vendor}
      submissions={submissions}
      session={session}
    />
  );
}
