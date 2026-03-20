import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const patchVendorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  contact_person: z.string().max(255).optional().nullable(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
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

    const vendorId = params.id;

    if (!vendorId || isNaN(Number(vendorId))) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      const vendorResult = await client.query(
        `SELECT 
          v.id,
          v.name,
          v.email,
          v.phone,
          v.address,
          v.contact_person,
          v.status,
          v.category,
          v.notes,
          v.created_at,
          v.updated_at
        FROM vendors v
        WHERE v.id = $1`,
        [vendorId],
      );

      if (vendorResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Vendor not found" },
          { status: 404 },
        );
      }

      const vendor = vendorResult.rows[0];

      const certificatesResult = await client.query(
        `SELECT 
          c.id,
          c.vendor_id,
          c.certificate_type,
          c.certificate_number,
          c.issuing_authority,
          c.issue_date,
          c.expiry_date,
          c.status,
          c.document_url,
          c.notes,
          c.created_at,
          c.updated_at
        FROM vendor_certificates c
        WHERE c.vendor_id = $1
        ORDER BY c.created_at DESC`,
        [vendorId],
      );

      const response = {
        ...vendor,
        certificates: certificatesResult.rows,
      };

      return NextResponse.json(response, { status: 200 });
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorId = params.id;

    if (!vendorId || isNaN(Number(vendorId))) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = patchVendorSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const data = parseResult.data;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      const existingVendor = await client.query(
        "SELECT id FROM vendors WHERE id = $1",
        [vendorId],
      );

      if (existingVendor.rows.length === 0) {
        return NextResponse.json(
          { error: "Vendor not found" },
          { status: 404 },
        );
      }

      const fields = Object.keys(data);
      const values = Object.values(data);

      const setClauses = fields.map(
        (field, index) => `${field} = $${index + 1}`,
      );
      setClauses.push(`updated_at = NOW()`);

      const updateQuery = `
        UPDATE vendors
        SET ${setClauses.join(", ")}
        WHERE id = $${fields.length + 1}
        RETURNING 
          id,
          name,
          email,
          phone,
          address,
          contact_person,
          status,
          category,
          notes,
          created_at,
          updated_at
      `;

      const updateResult = await client.query(updateQuery, [
        ...values,
        vendorId,
      ]);

      return NextResponse.json(updateResult.rows[0], { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating vendor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
