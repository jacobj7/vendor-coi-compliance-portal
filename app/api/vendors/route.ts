import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const querySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const parseResult = querySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { page, limit } = parseResult.data;
  const offset = (page - 1) * limit;

  const client = await pool.connect();

  try {
    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM vendors`,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const vendorsResult = await client.query(
      `
      SELECT
        v.id,
        v.name,
        v.email,
        v.phone,
        v.address,
        v.compliance_status,
        v.created_at,
        v.updated_at,
        COUNT(coi.id)::int AS certificates_of_insurance_count
      FROM vendors v
      LEFT JOIN certificates_of_insurance coi ON coi.vendor_id = v.id
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: vendorsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
