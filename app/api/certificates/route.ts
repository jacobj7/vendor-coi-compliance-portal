import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const querySchema = z.object({
  status: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = querySchema.parse({
      status: searchParams.get("status") ?? undefined,
    });

    let query = `
      SELECT
        c.id,
        c.name,
        c.status,
        c.issued_at,
        c.expires_at,
        c.created_at,
        c.updated_at,
        v.id AS vendor_id,
        v.name AS vendor_name
      FROM certificates c
      LEFT JOIN vendors v ON c.vendor_id = v.id
    `;

    const values: string[] = [];

    if (queryParams.status) {
      values.push(queryParams.status);
      query += ` WHERE c.status = $${values.length}`;
    }

    query += " ORDER BY c.created_at DESC";

    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      return NextResponse.json({ certificates: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error fetching certificates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
