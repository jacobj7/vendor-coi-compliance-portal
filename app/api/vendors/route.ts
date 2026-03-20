import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CreateVendorSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  contact_name: z.string().max(255).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  compliance_status: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = PaginationSchema.parse({
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 20,
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      compliance_status: searchParams.get("compliance_status") ?? undefined,
    });

    const offset = (params.page - 1) * params.limit;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.search) {
      conditions.push(
        `(v.name ILIKE $${paramIndex} OR v.email ILIKE $${paramIndex} OR v.contact_name ILIKE $${paramIndex})`,
      );
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.category) {
      conditions.push(`v.category = $${paramIndex}`);
      values.push(params.category);
      paramIndex++;
    }

    if (params.compliance_status) {
      conditions.push(`latest_cert.compliance_status = $${paramIndex}`);
      values.push(params.compliance_status);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM vendors v
      LEFT JOIN LATERAL (
        SELECT compliance_status, expiry_date, issued_date
        FROM certificates
        WHERE vendor_id = v.id
        ORDER BY issued_date DESC
        LIMIT 1
      ) latest_cert ON true
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        v.id,
        v.name,
        v.email,
        v.phone,
        v.address,
        v.contact_name,
        v.category,
        v.notes,
        v.created_at,
        v.updated_at,
        latest_cert.compliance_status,
        latest_cert.expiry_date AS certificate_expiry_date,
        latest_cert.issued_date AS certificate_issued_date
      FROM vendors v
      LEFT JOIN LATERAL (
        SELECT compliance_status, expiry_date, issued_date
        FROM certificates
        WHERE vendor_id = v.id
        ORDER BY issued_date DESC
        LIMIT 1
      ) latest_cert ON true
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countValues = [...values];
    const dataValues = [...values, params.limit, offset];

    const client = await pool.connect();
    try {
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, countValues),
        client.query(dataQuery, dataValues),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / params.limit);

      return NextResponse.json({
        data: dataResult.rows,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
          hasNextPage: params.page < totalPages,
          hasPrevPage: params.page > 1,
        },
      });
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
    console.error("GET /api/vendors error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = CreateVendorSchema.parse(body);

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO vendors (name, email, phone, address, contact_name, category, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          validated.name,
          validated.email ?? null,
          validated.phone ?? null,
          validated.address ?? null,
          validated.contact_name ?? null,
          validated.category ?? null,
          validated.notes ?? null,
        ],
      );

      return NextResponse.json({ data: result.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 422 },
      );
    }
    console.error("POST /api/vendors error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
