import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const tokenParamSchema = z.string().min(1);

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const tokenValidation = tokenParamSchema.safeParse(params.token);

  if (!tokenValidation.success) {
    return NextResponse.json(
      { error: "Invalid token format" },
      { status: 400 },
    );
  }

  const token = tokenValidation.data;

  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT
        sr.id,
        sr.token,
        sr.status,
        sr.expires_at,
        sr.created_at,
        sr.used_at,
        v.id AS vendor_id,
        v.name AS vendor_name,
        v.email AS vendor_email,
        v.company AS vendor_company,
        v.phone AS vendor_phone
      FROM submission_requests sr
      LEFT JOIN vendors v ON sr.vendor_id = v.id
      WHERE sr.token = $1`,
      [token],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Submission request not found" },
        { status: 404 },
      );
    }

    const row = result.rows[0];

    if (row.status === "used" || row.used_at !== null) {
      return NextResponse.json(
        { error: "This submission link has already been used" },
        { status: 404 },
      );
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This submission link has expired" },
        { status: 404 },
      );
    }

    if (row.status === "cancelled" || row.status === "expired") {
      return NextResponse.json(
        { error: "This submission link is no longer valid" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: row.id,
      token: row.token,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      vendor: {
        id: row.vendor_id,
        name: row.vendor_name,
        email: row.vendor_email,
        company: row.vendor_company,
        phone: row.vendor_phone,
      },
    });
  } catch (error) {
    console.error("Error fetching submission request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
