import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  contact_name: z.string().min(1, "Contact name is required"),
  category_id: z
    .number()
    .int()
    .positive("Category ID must be a positive integer"),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const complianceStatus = searchParams.get("compliance_status");

  const client = await pool.connect();
  try {
    let query = `
      SELECT
        v.id,
        v.name,
        v.email,
        v.contact_name,
        v.compliance_status,
        v.invite_token,
        v.created_at,
        v.updated_at,
        vc.id AS category_id,
        vc.name AS category_name,
        vc.description AS category_description
      FROM vendors v
      LEFT JOIN vendor_categories vc ON v.category_id = vc.id
    `;
    const params: string[] = [];

    if (complianceStatus) {
      params.push(complianceStatus);
      query += ` WHERE v.compliance_status = $${params.length}`;
    }

    query += " ORDER BY v.created_at DESC";

    const result = await client.query(query, params);

    const vendors = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      contact_name: row.contact_name,
      compliance_status: row.compliance_status,
      invite_token: row.invite_token,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category: row.category_id
        ? {
            id: row.category_id,
            name: row.category_name,
            description: row.category_description,
          }
        : null,
    }));

    return NextResponse.json(vendors, { status: 200 });
  } catch (error) {
    console.error("GET /api/vendors error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = vendorSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, contact_name, category_id } = parseResult.data;
  const invite_token = uuidv4();

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO vendors (name, email, contact_name, category_id, invite_token, compliance_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
       RETURNING id, name, email, contact_name, category_id, invite_token, compliance_status, created_at, updated_at`,
      [name, email, contact_name, category_id, invite_token],
    );

    const vendor = result.rows[0];

    return NextResponse.json(vendor, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/vendors error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A vendor with this email already exists" },
        { status: 409 },
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "23503"
    ) {
      return NextResponse.json(
        { error: "Invalid category_id: category does not exist" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
