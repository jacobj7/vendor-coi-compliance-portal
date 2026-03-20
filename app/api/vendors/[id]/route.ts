import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Pool } from "pg";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a numeric string"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid vendor ID", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const vendorId = parseInt(parsed.data.id, 10);

    const client = await pool.connect();
    try {
      const vendorResult = await client.query(
        `
        SELECT
          v.id,
          v.name,
          v.contact_name,
          v.contact_email,
          v.contact_phone,
          v.address,
          v.city,
          v.state,
          v.zip,
          v.country,
          v.website,
          v.notes,
          v.is_active,
          v.created_at,
          v.updated_at,
          vc.id AS category_id,
          vc.name AS category_name,
          vc.description AS category_description
        FROM vendors v
        LEFT JOIN vendor_categories vc ON v.category_id = vc.id
        WHERE v.id = $1
        `,
        [vendorId],
      );

      if (vendorResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Vendor not found" },
          { status: 404 },
        );
      }

      const vendorRow = vendorResult.rows[0];

      const coiResult = await client.query(
        `
        SELECT
          coi.id,
          coi.vendor_id,
          coi.policy_number,
          coi.insurer_name,
          coi.coverage_type,
          coi.coverage_amount,
          coi.effective_date,
          coi.expiration_date,
          coi.document_url,
          coi.notes,
          coi.is_current,
          coi.created_at,
          coi.updated_at
        FROM certificates_of_insurance coi
        WHERE coi.vendor_id = $1
        ORDER BY coi.created_at DESC
        `,
        [vendorId],
      );

      const vendor = {
        id: vendorRow.id,
        name: vendorRow.name,
        contactName: vendorRow.contact_name,
        contactEmail: vendorRow.contact_email,
        contactPhone: vendorRow.contact_phone,
        address: vendorRow.address,
        city: vendorRow.city,
        state: vendorRow.state,
        zip: vendorRow.zip,
        country: vendorRow.country,
        website: vendorRow.website,
        notes: vendorRow.notes,
        isActive: vendorRow.is_active,
        createdAt: vendorRow.created_at,
        updatedAt: vendorRow.updated_at,
        category: vendorRow.category_id
          ? {
              id: vendorRow.category_id,
              name: vendorRow.category_name,
              description: vendorRow.category_description,
            }
          : null,
        certificatesOfInsurance: coiResult.rows.map((coi) => ({
          id: coi.id,
          vendorId: coi.vendor_id,
          policyNumber: coi.policy_number,
          insurerName: coi.insurer_name,
          coverageType: coi.coverage_type,
          coverageAmount: coi.coverage_amount,
          effectiveDate: coi.effective_date,
          expirationDate: coi.expiration_date,
          documentUrl: coi.document_url,
          notes: coi.notes,
          isCurrent: coi.is_current,
          createdAt: coi.created_at,
          updatedAt: coi.updated_at,
        })),
      };

      return NextResponse.json({ vendor }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
